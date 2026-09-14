'use strict';

const mongoose = require('../db');
const auth = require('../auth');
const { validateBearerToken, isApiMasterEnabled, enabledScopes } = require('./tokens');
const { listCatalog } = require('../materials');
const { createLoadSummary } = require('../summary');

const IP_WINDOW_MS = 15 * 60 * 1000;
const IP_MAX_REQUESTS = 60;
const JTI_MAX_REQUESTS = 120;
const DEFAULT_PAGE_LIMIT = 50;
const MAX_PAGE_LIMIT = 200;
const RATE_LIMIT_PRUNE_EVERY = 64;

const MATERIAL_ITEM_KEYS = [
	'itemName', 'itemDesc', 'faction', 'itemCategory', 'category', 'subcategory',
	'categoryIcon', 'wikiTitle', 'wikiUrl', 'iconUrl', 'damageDesc', 'vehiclePen',
	'highVelocityBonus', 'numberProducedBonus',
];

const MATERIAL_CATEGORY_KEYS = ['id', 'icon', 'subcategories'];

const ipBuckets = new Map();
const jtiBuckets = new Map();
let rateLimitCheckCount = 0;

function resetRateLimitsForTests() {
	ipBuckets.clear();
	jtiBuckets.clear();
	rateLimitCheckCount = 0;
}

function seedRateLimitBucketsForTests({ ip, jti, checkCount } = {}) {
	if (ip) {
		for (const [key, entry] of Object.entries(ip)) ipBuckets.set(key, entry);
	}
	if (jti) {
		for (const [key, entry] of Object.entries(jti)) jtiBuckets.set(key, entry);
	}
	if (checkCount != null) rateLimitCheckCount = checkCount;
}

function clientIp(req) {
	return auth.clientIp(req);
}

function pruneExpiredBuckets(map, now) {
	for (const [key, entry] of map) {
		if (!entry || entry.resetAt < now) map.delete(key);
	}
}

function maybePruneRateLimits() {
	rateLimitCheckCount += 1;
	if (rateLimitCheckCount % RATE_LIMIT_PRUNE_EVERY !== 0) return;
	const now = Date.now();
	pruneExpiredBuckets(ipBuckets, now);
	pruneExpiredBuckets(jtiBuckets, now);
}

function checkRateLimit(map, key, max, windowMs, now = Date.now()) {
	maybePruneRateLimits();
	let entry = map.get(key);
	if (!entry || entry.resetAt < now) {
		entry = { count: 0, resetAt: now + windowMs };
		map.set(key, entry);
	}
	entry.count += 1;
	if (entry.count > max) {
		return {
			ok: false,
			retry_after_ms: entry.resetAt - now,
		};
	}
	return { ok: true };
}

function enforcePublicRateLimits(req, jti, routeKey) {
	const ipKey = `${clientIp(req)}:${routeKey}`;
	const ipCheck = checkRateLimit(ipBuckets, ipKey, IP_MAX_REQUESTS, IP_WINDOW_MS);
	if (!ipCheck.ok) {
		const err = new Error('Rate limit');
		err.status = 429;
		err.code = 'API_RATE_LIMIT';
		err.retry_after_ms = ipCheck.retry_after_ms;
		throw err;
	}

	if (jti) {
		const jtiKey = `${jti}:${routeKey}`;
		const jtiCheck = checkRateLimit(jtiBuckets, jtiKey, JTI_MAX_REQUESTS, IP_WINDOW_MS);
		if (!jtiCheck.ok) {
			const err = new Error('Rate limit');
			err.status = 429;
			err.code = 'API_RATE_LIMIT';
			err.retry_after_ms = jtiCheck.retry_after_ms;
			throw err;
		}
	}
}

function isRouteEnabled(scope, env = process.env) {
	if (!isApiMasterEnabled(env)) return false;
	return enabledScopes(env).includes(scope);
}

function publicJsonHeaders(extra = {}) {
	return {
		'Cache-Control': 'no-store',
		'X-Content-Type-Options': 'nosniff',
		'X-Frame-Options': 'DENY',
		'Referrer-Policy': 'no-referrer',
		'Vary': 'Authorization',
		...extra,
	};
}

function pickAllowlist(obj, keys) {
	const out = {};
	for (const key of keys) {
		if (obj[key] !== undefined) out[key] = obj[key];
	}
	return out;
}

function parseQueryParams(req) {
	const rawUrl = req.url || '';
	const q = rawUrl.includes('?') ? rawUrl.slice(rawUrl.indexOf('?') + 1) : '';
	return new URLSearchParams(q);
}

function parsePagination(req, { defaultLimit = DEFAULT_PAGE_LIMIT, maxLimit = MAX_PAGE_LIMIT } = {}) {
	const params = parseQueryParams(req);
	let limit = Number.parseInt(params.get('limit') || String(defaultLimit), 10);
	let offset = Number.parseInt(params.get('offset') || '0', 10);
	if (!Number.isFinite(limit) || limit < 1) limit = defaultLimit;
	if (limit > maxLimit) limit = maxLimit;
	if (!Number.isFinite(offset) || offset < 0) offset = 0;
	return { limit, offset, params };
}

function paginateMeta(total, limit, offset, count) {
	const next = offset + count;
	return {
		total,
		limit,
		offset,
		count,
		has_more: next < total,
		next_offset: next < total ? next : null,
	};
}

function sanitizeMaterialCategory(category) {
	return pickAllowlist(category, MATERIAL_CATEGORY_KEYS);
}

function sanitizeMaterialItem(item) {
	return pickAllowlist(item, MATERIAL_ITEM_KEYS);
}

async function loadMaterialsCatalog() {
	return listCatalog();
}

async function authorizeMaterials(req, env, routeKey) {
	if (!isRouteEnabled('materials', env)) {
		const err = new Error('Not found');
		err.status = 404;
		err.code = 'API_DISABLED';
		throw err;
	}
	const token = await validateBearerToken(req, 'materials', env);
	enforcePublicRateLimits(req, token.jti, routeKey);
	return loadMaterialsCatalog();
}

function filterMaterialItems(items, params) {
	let out = items;
	const category = params.get('category');
	const subcategory = params.get('subcategory');
	if (category) out = out.filter((item) => item.category === category);
	if (subcategory) out = out.filter((item) => item.subcategory === subcategory);
	return out;
}

function sanitizeMaterialsCatalog(catalog) {
	return {
		generated_at: catalog.generated_at,
		categories: (catalog.categories || []).map(sanitizeMaterialCategory),
		items: (catalog.items || []).map(sanitizeMaterialItem),
		icons: catalog.icons ? pickAllowlist(catalog.icons, ['dir', 'with_icon', 'total']) : null,
	};
}

async function handlePublicMaterialCategories(req, env = process.env) {
	const catalog = await authorizeMaterials(req, env, 'materials-categories');
	const { limit, offset } = parsePagination(req);
	const categories = (catalog.categories || []).map(sanitizeMaterialCategory);
	const slice = categories.slice(offset, offset + limit);
	return {
		generated_at: catalog.generated_at,
		...paginateMeta(categories.length, limit, offset, slice.length),
		categories: slice,
	};
}

async function handlePublicMaterialItems(req, env = process.env) {
	const catalog = await authorizeMaterials(req, env, 'materials-items');
	const { limit, offset, params } = parsePagination(req);
	const filtered = filterMaterialItems(catalog.items || [], params).map(sanitizeMaterialItem);
	const slice = filtered.slice(offset, offset + limit);
	return {
		generated_at: catalog.generated_at,
		...paginateMeta(filtered.length, limit, offset, slice.length),
		items: slice,
	};
}

function sanitizePublicData(summary) {
	return {
		generated_at: summary.generated_at,
		war: summary.war ? pickAllowlist(summary.war, [
			'available', 'winner', 'conquestStartTime', 'conquestEndTime', 'scheduledEndTime',
			'warNumber', 'requiredVictoryTowns', 'colonialVictoryTowns', 'wardenVictoryTowns',
			'colonialScorchedVictoryTowns', 'wardenScorchedVictoryTowns', 'colonialPlayers',
			'wardenPlayers', 'dayOfWar', 'clientVersion',
		]) : null,
		kpis: summary.kpis ? pickAllowlist(summary.kpis, [
			'active_guilds', 'left_guilds', 'total_seen_guilds', 'setup_servers', 'pending_setup',
			'setup_rate_pct', 'total_commands', 'avg_commands_per_active', 'guilds_with_commands',
			'engaged_7d', 'engagement_7d_pct', 'total_operations', 'total_stock_boards',
			'total_materials', 'total_materials_validated', 'total_members_active', 'avg_members',
		]) : null,
		commands: (summary.commands || []).map((c) => pickAllowlist(c, ['name', 'total', 'pct'])),
		activity: summary.activity || null,
		members: summary.members || null,
	};
}

function sanitizePublicGuild(g) {
	return pickAllowlist(g, [
		'guild_id', 'name', 'member_count', 'command_count', 'last_command_at',
		'first_command_at', 'joined_at', 'left_at', 'created_at', 'operation_count',
		'stock_board_count', 'material_count', 'material_validated_count', 'setup',
		'lang', 'camp', 'logs', 'activity', 'blocked', 'cmds_per_member',
	]);
}

function createPublicDataLoader(envPath) {
	const loadSummary = createLoadSummary(envPath);
	return async function handlePublicData(req, env = process.env) {
		if (!isRouteEnabled('data', env)) {
			const err = new Error('Not found');
			err.status = 404;
			err.code = 'API_DISABLED';
			throw err;
		}
		const token = await validateBearerToken(req, 'data', env);
		enforcePublicRateLimits(req, token.jti, 'data');
		const summary = await loadSummary();
		return sanitizePublicData(summary);
	};
}

async function handlePublicGuilds(req, env = process.env) {
	if (!isRouteEnabled('guilds', env)) {
		const err = new Error('Not found');
		err.status = 404;
		err.code = 'API_DISABLED';
		throw err;
	}
	const token = await validateBearerToken(req, 'guilds', env);
	enforcePublicRateLimits(req, token.jti, 'guilds');

	const { limit, offset } = parsePagination(req);

	const db = mongoose.connection.db;
	const statsCol = db.collection('stats');
	const filter = { left_at: { $exists: false } };
	const guildProject = {
		guild_id: 1,
		name: 1,
		member_count: 1,
		command_count: 1,
		last_command_at: 1,
		first_command_at: 1,
		joined_at: 1,
		created_at: 1,
		operation_count: 1,
		stock_board_count: 1,
		material_count: 1,
		material_validated_count: 1,
	};

	const [total, stats] = await Promise.all([
		statsCol.countDocuments(filter),
		statsCol.aggregate([
			{ $match: filter },
			{ $addFields: { _sort_name: { $toLower: { $ifNull: ['$name', '$guild_id'] } } } },
			{ $sort: { _sort_name: 1, guild_id: 1 } },
			{ $skip: offset },
			{ $limit: limit },
			{ $project: guildProject },
		]).toArray(),
	]);

	const guildIds = stats.map((g) => g.guild_id);
	const servers = guildIds.length
		? await db.collection('servers').find({ guild_id: { $in: guildIds } }).project({
			guild_id: 1, lang: 1, camp: 1, logs: 1,
		}).toArray()
		: [];
	const serverByGuild = new Map(servers.map((s) => [s.guild_id, s]));

	const guilds = stats.map((g) => {
		const setup = serverByGuild.get(g.guild_id);
		return sanitizePublicGuild({
			guild_id: g.guild_id,
			name: g.name || g.guild_id,
			member_count: g.member_count || 0,
			command_count: g.command_count || 0,
			last_command_at: g.last_command_at || null,
			first_command_at: g.first_command_at || null,
			joined_at: g.joined_at || null,
			left_at: null,
			created_at: g.created_at || null,
			operation_count: g.operation_count || 0,
			stock_board_count: g.stock_board_count || 0,
			material_count: g.material_count || 0,
			material_validated_count: g.material_validated_count || 0,
			setup: Boolean(setup),
			lang: setup?.lang || null,
			camp: setup?.camp || null,
			logs: Boolean(setup?.logs),
			activity: null,
			blocked: false,
			cmds_per_member: g.member_count
				? Math.round(((g.command_count || 0) / g.member_count) * 100) / 100
				: 0,
		});
	});

	return {
		generated_at: new Date().toISOString(),
		...paginateMeta(total, limit, offset, guilds.length),
		guilds,
	};
}

module.exports = {
	IP_WINDOW_MS,
	IP_MAX_REQUESTS,
	JTI_MAX_REQUESTS,
	DEFAULT_PAGE_LIMIT,
	MAX_PAGE_LIMIT,
	resetRateLimitsForTests,
	seedRateLimitBucketsForTests,
	publicJsonHeaders,
	isRouteEnabled,
	parsePagination,
	paginateMeta,
	sanitizeMaterialCategory,
	sanitizeMaterialItem,
	sanitizeMaterialsCatalog,
	sanitizePublicData,
	sanitizePublicGuild,
	handlePublicMaterialCategories,
	handlePublicMaterialItems,
	createPublicDataLoader,
	handlePublicGuilds,
};
