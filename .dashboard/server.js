#!/usr/bin/env node
'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

const PORT = Number(process.env.DASHBOARD_PORT) || 3847;
const INDEX = path.join(__dirname, 'index.html');
const ROOT = path.join(__dirname, '..');
const ENV_FILE = process.env.DASHBOARD_ENV_FILE
	|| (fs.existsSync(path.join(ROOT, '.env.prod')) ? '.env.prod' : '.env');
const ENV_PATH = path.isAbsolute(ENV_FILE) ? ENV_FILE : path.join(ROOT, ENV_FILE);

require('dotenv').config({ path: ENV_PATH, quiet: true });

const MS = {
	h24: 24 * 60 * 60 * 1000,
	d7: 7 * 24 * 60 * 60 * 1000,
	d30: 30 * 24 * 60 * 60 * 1000,
	d90: 90 * 24 * 60 * 60 * 1000,
};

function monthKey(date) {
	const d = new Date(date);
	if (Number.isNaN(d.getTime())) return null;
	return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

function fillMonths(map, months = 12) {
	const out = [];
	const now = new Date();
	for (let i = months - 1; i >= 0; i -= 1) {
		const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
		const key = monthKey(d);
		out.push({ month: key, count: map.get(key) || 0 });
	}
	return out;
}

function memberBucket(n) {
	const v = Number(n) || 0;
	if (v < 10) return '1–9';
	if (v < 50) return '10–49';
	if (v < 100) return '50–99';
	if (v < 250) return '100–249';
	if (v < 500) return '250–499';
	return '500+';
}

function activityBucket(lastAt, now) {
	if (!lastAt) return 'never';
	const age = now - new Date(lastAt).getTime();
	if (age <= MS.h24) return '24h';
	if (age <= MS.d7) return '7d';
	if (age <= MS.d30) return '30d';
	if (age <= MS.d90) return '90d';
	return 'older';
}

function topEntries(obj, limit = 5) {
	return Object.entries(obj || {})
		.sort((a, b) => b[1] - a[1])
		.slice(0, limit)
		.map(([name, count]) => ({ name, count }));
}

function groupCount(docs, keyFn) {
	const map = new Map();
	for (const doc of docs) {
		const key = keyFn(doc);
		map.set(key, (map.get(key) || 0) + 1);
	}
	return [...map.entries()]
		.map(([name, total]) => ({ name, total }))
		.sort((a, b) => b.total - a.total);
}

async function loadSummary() {
	const db = mongoose.connection.db;
	const statsCol = db.collection('stats');
	const serversCol = db.collection('servers');
	const orderboardsCol = db.collection('orderboards');
	const orderlinesCol = db.collection('orderlines');
	const stockpilesCol = db.collection('stockpiles');
	const operationsCol = db.collection('operations');
	const notifCol = db.collection('notificationsubscriptions');
	const trackedCol = db.collection('trackedmessages');

	const now = Date.now();

	const [
		allStats,
		servers,
		commandTotals,
		orderboards,
		orderlines,
		stockpileCount,
		operations,
		notifications,
		trackedCount,
	] = await Promise.all([
		statsCol.find({}).toArray(),
		serversCol.find({}).toArray(),
		statsCol.aggregate([
			{
				$project: {
					items: { $objectToArray: { $ifNull: ['$command_breakdown', {}] } },
				},
			},
			{ $unwind: '$items' },
			{ $group: { _id: '$items.k', total: { $sum: '$items.v' } } },
			{ $sort: { total: -1 } },
		]).toArray(),
		orderboardsCol.find({}).toArray(),
		orderlinesCol.find({}).toArray(),
		stockpilesCol.estimatedDocumentCount(),
		operationsCol.find({}).toArray(),
		notifCol.find({}).toArray(),
		trackedCol.estimatedDocumentCount(),
	]);

	const setupIds = new Set(servers.map((s) => s.guild_id));
	const serverByGuild = new Map(servers.map((s) => [s.guild_id, s]));
	const active = allStats.filter((g) => !g.left_at);
	const left = allStats.filter((g) => g.left_at);

	const activityCounts = {
		'24h': 0, '7d': 0, '30d': 0, '90d': 0, older: 0, never: 0,
	};
	const memberCounts = {
		'1–9': 0, '10–49': 0, '50–99': 0, '100–249': 0, '250–499': 0, '500+': 0,
	};
	const joins = new Map();
	const leaves = new Map();

	let totalCommands = 0;
	let totalOps = 0;
	let totalStockBoards = 0;
	let totalMaterials = 0;
	let totalMaterialsValidated = 0;
	let membersActive = 0;
	let withCommands = 0;
	let engaged7d = 0;

	for (const g of allStats) {
		totalCommands += g.command_count || 0;
		totalOps += g.operation_count || 0;
		totalStockBoards += g.stock_board_count || 0;
		totalMaterials += g.material_count || 0;
		totalMaterialsValidated += g.material_validated_count || 0;

		const jk = monthKey(g.joined_at);
		if (jk) joins.set(jk, (joins.get(jk) || 0) + 1);
		const lk = monthKey(g.left_at);
		if (lk) leaves.set(lk, (leaves.get(lk) || 0) + 1);
	}

	for (const g of active) {
		membersActive += g.member_count || 0;
		memberCounts[memberBucket(g.member_count)] += 1;
		const bucket = activityBucket(g.last_command_at, now);
		activityCounts[bucket] += 1;
		if ((g.command_count || 0) > 0) withCommands += 1;
		if (bucket === '24h' || bucket === '7d') engaged7d += 1;
	}

	const cmdTotal = commandTotals.reduce((n, r) => n + r.total, 0) || 1;
	const commands = commandTotals.map((row) => ({
		name: row._id,
		total: row.total,
		pct: Math.round((row.total / cmdTotal) * 1000) / 10,
	}));

	const mapGuild = (g) => {
		const setup = serverByGuild.get(g.guild_id);
		return {
			guild_id: g.guild_id,
			name: g.name || g.guild_id,
			member_count: g.member_count || 0,
			command_count: g.command_count || 0,
			last_command_at: g.last_command_at || null,
			first_command_at: g.first_command_at || null,
			joined_at: g.joined_at || null,
			left_at: g.left_at || null,
			created_at: g.created_at || null,
			operation_count: g.operation_count || 0,
			stock_board_count: g.stock_board_count || 0,
			material_count: g.material_count || 0,
			material_validated_count: g.material_validated_count || 0,
			setup: Boolean(setup),
			lang: setup?.lang || null,
			camp: setup?.camp || null,
			logs: Boolean(setup?.logs),
			activity: activityBucket(g.last_command_at, now),
			command_breakdown: g.command_breakdown && typeof g.command_breakdown === 'object'
				? g.command_breakdown
				: {},
			top_commands: topEntries(g.command_breakdown, 5),
			cmds_per_member: g.member_count
				? Math.round(((g.command_count || 0) / g.member_count) * 100) / 100
				: 0,
		};
	};

	const guilds = active.map(mapGuild).sort((a, b) => {
		const ta = a.last_command_at ? new Date(a.last_command_at).getTime() : 0;
		const tb = b.last_command_at ? new Date(b.last_command_at).getTime() : 0;
		return tb - ta;
	});

	const leftGuilds = left
		.map(mapGuild)
		.sort((a, b) => new Date(b.left_at) - new Date(a.left_at))
		.slice(0, 25);

	const lineProgress = orderlines.reduce(
		(acc, line) => {
			acc.target += line.target || 0;
			acc.current += line.current || 0;
			acc.by_priority[line.priority || 'neutral'] =
				(acc.by_priority[line.priority || 'neutral'] || 0) + 1;
			const done = (line.target || 0) > 0 && (line.current || 0) >= (line.target || 0);
			if (done) acc.complete += 1;
			return acc;
		},
		{ current: 0, target: 0, complete: 0, by_priority: {} },
	);

	return {
		generated_at: new Date().toISOString(),
		env_file: path.basename(ENV_PATH),
		db_name: mongoose.connection.name || process.env.MONGODB_NAME || null,
		kpis: {
			active_guilds: active.length,
			left_guilds: left.length,
			total_seen_guilds: allStats.length,
			setup_servers: servers.length,
			pending_setup: guilds.filter((g) => !g.setup).length,
			setup_rate_pct: active.length
				? Math.round((servers.filter((s) => active.some((g) => g.guild_id === s.guild_id)).length / active.length) * 1000) / 10
				: 0,
			total_commands: totalCommands,
			avg_commands_per_active: active.length
				? Math.round((totalCommands / active.length) * 10) / 10
				: 0,
			guilds_with_commands: withCommands,
			engaged_7d: engaged7d,
			engagement_7d_pct: active.length
				? Math.round((engaged7d / active.length) * 1000) / 10
				: 0,
			total_operations: totalOps,
			total_stock_boards: totalStockBoards,
			total_materials: totalMaterials,
			total_materials_validated: totalMaterialsValidated,
			total_members_active: membersActive,
			avg_members: active.length
				? Math.round(membersActive / active.length)
				: 0,
			orderboards: orderboards.length,
			orderboards_open: orderboards.filter((b) => b.status === 'open').length,
			orderlines: orderlines.length,
			stockpiles: stockpileCount,
			operations_docs: operations.length,
			notifications: notifications.length,
			tracked_messages: trackedCount,
		},
		commands,
		activity: {
			buckets: [
				{ name: '24h', total: activityCounts['24h'] },
				{ name: '7j', total: activityCounts['7d'] },
				{ name: '30j', total: activityCounts['30d'] },
				{ name: '90j', total: activityCounts['90d'] },
				{ name: '>90j', total: activityCounts.older },
				{ name: 'jamais', total: activityCounts.never },
			],
			joins_by_month: fillMonths(joins, 12),
			leaves_by_month: fillMonths(leaves, 12),
		},
		members: {
			distribution: Object.entries(memberCounts).map(([name, total]) => ({ name, total })),
		},
		product: {
			orderboards_by_status: groupCount(orderboards, (b) => b.status || 'unknown'),
			orderboards_by_kind: groupCount(orderboards, (b) => b.kind || 'unknown'),
			orderlines_by_priority: Object.entries(lineProgress.by_priority)
				.map(([name, total]) => ({ name, total }))
				.sort((a, b) => b.total - a.total),
			orderline_progress: {
				current: lineProgress.current,
				target: lineProgress.target,
				complete: lineProgress.complete,
				total: orderlines.length,
				pct: lineProgress.target
					? Math.round((lineProgress.current / lineProgress.target) * 1000) / 10
					: 0,
			},
			operations_by_status: groupCount(operations, (o) => o.status || 'unknown'),
			notifications_by_type: groupCount(notifications, (n) => n.notification_type || 'unknown'),
			servers_by_lang: groupCount(servers, (s) => s.lang || 'unknown'),
			servers_by_camp: groupCount(servers, (s) => s.camp || 'unknown'),
			servers_logs_enabled: servers.filter((s) => s.logs).length,
		},
		top: {
			by_commands: [...guilds].sort((a, b) => b.command_count - a.command_count).slice(0, 10),
			by_members: [...guilds].sort((a, b) => b.member_count - a.member_count).slice(0, 10),
			by_ops: [...guilds].sort((a, b) => b.operation_count - a.operation_count).slice(0, 10),
			by_stock: [...guilds].sort((a, b) => b.stock_board_count - a.stock_board_count).slice(0, 10),
		},
		guilds,
		left_guilds: leftGuilds,
	};
}

const contactsCache = { at: 0, data: null };
const CONTACTS_TTL_MS = 5 * 60 * 1000;

function sleep(ms) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

function avatarUrl(user) {
	if (!user?.id) return null;
	if (user.avatar) {
		const ext = String(user.avatar).startsWith('a_') ? 'gif' : 'png';
		return `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.${ext}?size=64`;
	}
	const idx = user.discriminator && user.discriminator !== '0'
		? Number(user.discriminator) % 5
		: Number((BigInt(user.id) >> 22n) % 6n);
	return `https://cdn.discordapp.com/embed/avatars/${idx}.png`;
}

function mapUser(user) {
	if (!user?.id) return null;
	return {
		user_id: user.id,
		username: user.username || null,
		display_name: user.global_name || user.username || user.id,
		avatar_url: avatarUrl(user),
		profile_url: `https://discord.com/users/${user.id}`,
	};
}

async function discordFetch(path) {
	const token = process.env.TOKEN;
	if (!token) return { ok: false, status: 0, data: null, error: 'TOKEN manquant' };
	const res = await fetch(`https://discord.com/api/v10${path}`, {
		headers: {
			Authorization: `Bot ${token}`,
			'User-Agent': 'FoxBot-Dashboard (local)',
		},
	});
	if (res.status === 429) {
		const body = await res.json().catch(() => ({}));
		const wait = Math.ceil(Number(body.retry_after || 1) * 1000);
		await sleep(Math.min(wait, 5000));
		return discordFetch(path);
	}
	if (!res.ok) {
		const text = await res.text().catch(() => '');
		return { ok: false, status: res.status, data: null, error: text.slice(0, 200) };
	}
	return { ok: true, status: res.status, data: await res.json(), error: null };
}

function bumpCreator(map, guildId, userId, kind) {
	if (!userId || userId === '0') return;
	if (!map.has(guildId)) map.set(guildId, new Map());
	const users = map.get(guildId);
	if (!users.has(userId)) {
		users.set(userId, { user_id: userId, stockpiles: 0, operations: 0, boards: 0, lines: 0 });
	}
	users.get(userId)[kind] += 1;
}

async function loadContacts({ force = false } = {}) {
	if (!force && contactsCache.data && (Date.now() - contactsCache.at) < CONTACTS_TTL_MS) {
		return contactsCache.data;
	}

	const db = mongoose.connection.db;
	const [allStats, stockpiles, operations, orderboards, orderlines] = await Promise.all([
		db.collection('stats').find({}).project({
			guild_id: 1, name: 1, member_count: 1, joined_at: 1, left_at: 1,
			command_count: 1, last_command_at: 1, owner_id: 1,
		}).toArray(),
		db.collection('stockpiles').find({
			owner_id: { $exists: true, $nin: [null, '', '0'] },
			deleted: { $ne: true },
		}).project({ server_id: 1, owner_id: 1 }).toArray(),
		db.collection('operations').find({
			owner_id: { $exists: true, $nin: [null, '', '0'] },
		}).project({ guild_id: 1, owner_id: 1 }).toArray(),
		db.collection('orderboards').find({
			owner_id: { $exists: true, $nin: [null, '', '0'] },
		}).project({ guild_id: 1, owner_id: 1 }).toArray(),
		db.collection('orderlines').find({
			owner_id: { $exists: true, $nin: [null, '', '0'] },
		}).project({ guild_id: 1, owner_id: 1 }).toArray(),
	]);

	const creatorsByGuild = new Map();
	for (const s of stockpiles) bumpCreator(creatorsByGuild, s.server_id, s.owner_id, 'stockpiles');
	for (const o of operations) bumpCreator(creatorsByGuild, o.guild_id, o.owner_id, 'operations');
	for (const b of orderboards) bumpCreator(creatorsByGuild, b.guild_id, b.owner_id, 'boards');
	for (const l of orderlines) bumpCreator(creatorsByGuild, l.guild_id, l.owner_id, 'lines');

	const token = process.env.TOKEN;
	const userCache = new Map();
	const warnings = [];

	async function resolveUser(id) {
		if (!id || id === '0') return null;
		if (userCache.has(id)) return userCache.get(id);
		if (!token) {
			const fallback = { user_id: id, username: null, display_name: id, avatar_url: null, profile_url: `https://discord.com/users/${id}` };
			userCache.set(id, fallback);
			return fallback;
		}
		const res = await discordFetch(`/users/${id}`);
		const mapped = res.ok ? mapUser(res.data) : {
			user_id: id,
			username: null,
			display_name: id,
			avatar_url: null,
			profile_url: `https://discord.com/users/${id}`,
		};
		if (!res.ok && res.status && res.status !== 404) {
			warnings.push(`user ${id}: HTTP ${res.status}`);
		}
		userCache.set(id, mapped);
		return mapped;
	}

	const guildsOut = [];
	const ownerBackfill = [];
	for (const g of allStats) {
		const active = !g.left_at;
		let ownerId = g.owner_id || null;
		let owner = null;
		let discord = { guild_ok: false, error: null };

		if (token && active) {
			const guildRes = await discordFetch(`/guilds/${g.guild_id}`);
			if (guildRes.ok) {
				discord.guild_ok = true;
				const fresh = guildRes.data.owner_id || null;
				if (fresh && fresh !== ownerId) {
					ownerId = fresh;
					ownerBackfill.push({ guild_id: g.guild_id, owner_id: fresh });
				}
				else if (fresh) {
					ownerId = fresh;
					if (!g.owner_id) ownerBackfill.push({ guild_id: g.guild_id, owner_id: fresh });
				}
			}
			else {
				discord.error = `guild HTTP ${guildRes.status}`;
			}
		}

		if (ownerId) owner = await resolveUser(ownerId);

		const creatorsRaw = [...(creatorsByGuild.get(g.guild_id)?.values() || [])]
			.sort((a, b) => (b.stockpiles + b.operations + b.boards + b.lines) - (a.stockpiles + a.operations + a.boards + a.lines));
		const creators = [];
		for (const c of creatorsRaw) {
			const user = await resolveUser(c.user_id);
			creators.push({ ...user, ...c });
		}

		guildsOut.push({
			guild_id: g.guild_id,
			name: g.name || g.guild_id,
			active,
			member_count: g.member_count || 0,
			joined_at: g.joined_at || null,
			left_at: g.left_at || null,
			command_count: g.command_count || 0,
			last_command_at: g.last_command_at || null,
			owner_id: ownerId,
			owner,
			creators,
			discord,
		});
	}

	if (ownerBackfill.length) {
		await Promise.all(ownerBackfill.map((row) =>
			db.collection('stats').updateOne(
				{ guild_id: row.guild_id },
				{ $set: { owner_id: row.owner_id } },
			),
		));
	}

	guildsOut.sort((a, b) => {
		if (a.active !== b.active) return a.active ? -1 : 1;
		return (b.command_count || 0) - (a.command_count || 0);
	});

	const peopleMap = new Map();
	for (const g of guildsOut) {
		const add = (user, role) => {
			if (!user?.user_id) return;
			if (!peopleMap.has(user.user_id)) {
				peopleMap.set(user.user_id, {
					...user,
					roles: new Set(),
					guilds: [],
				});
			}
			const p = peopleMap.get(user.user_id);
			p.roles.add(role);
			p.guilds.push({
				guild_id: g.guild_id,
				name: g.name,
				active: g.active,
				role,
				stockpiles: user.stockpiles || 0,
				operations: user.operations || 0,
				boards: user.boards || 0,
				lines: user.lines || 0,
			});
		};
		add(g.owner, 'owner');
		for (const c of g.creators) add(c, 'creator');
	}

	const people = [...peopleMap.values()]
		.map((p) => ({
			...p,
			roles: [...p.roles],
			guild_count: new Set(p.guilds.map((x) => x.guild_id)).size,
		}))
		.sort((a, b) => b.guild_count - a.guild_count || String(a.display_name).localeCompare(String(b.display_name)));

	const activeCount = guildsOut.filter((g) => g.active).length;
	const data = {
		generated_at: new Date().toISOString(),
		discord_token: Boolean(token),
		warnings: warnings.slice(0, 20),
		kpis: {
			guilds: guildsOut.length,
			active_guilds: activeCount,
			left_guilds: guildsOut.length - activeCount,
			with_owner: guildsOut.filter((g) => g.owner).length,
			unique_people: people.length,
		},
		guilds: guildsOut,
		people,
	};

	contactsCache.at = Date.now();
	contactsCache.data = data;
	return data;
}

function sendJson(res, status, body) {
	res.writeHead(status, {
		'Content-Type': 'application/json; charset=utf-8',
		'Cache-Control': 'no-store',
	});
	res.end(JSON.stringify(body));
}

function sendHtml(res) {
	res.writeHead(200, {
		'Content-Type': 'text/html; charset=utf-8',
		'Cache-Control': 'no-store',
	});
	res.end(fs.readFileSync(INDEX, 'utf8'));
}

async function main() {
	const url = process.env.MONGODB_URL;
	if (!url) {
		console.error('MONGODB_URL requis (.env à la racine du projet).');
		process.exit(1);
	}

	const dbName = process.env.MONGODB_NAME || undefined;
	await mongoose.connect(url, dbName ? { dbName } : undefined);
	console.log(`[dashboard] env=${path.basename(ENV_PATH)} db=${dbName || '(from URL)'} → http://127.0.0.1:${PORT}`);

	const server = http.createServer(async (req, res) => {
		try {
			const urlPath = (req.url || '/').split('?')[0];
			if (urlPath === '/api/summary') {
				return sendJson(res, 200, await loadSummary());
			}
			if (urlPath === '/api/contacts') {
				const force = (req.url || '').includes('force=1');
				return sendJson(res, 200, await loadContacts({ force }));
			}
			if (urlPath === '/' || urlPath === '/index.html') {
				return sendHtml(res);
			}
			res.writeHead(404, { 'Content-Type': 'text/plain' });
			res.end('Not found');
		}
		catch (err) {
			console.error(err);
			sendJson(res, 500, { error: err.message || 'Internal error' });
		}
	});

	server.listen(PORT, '127.0.0.1', () => {
		console.log(`[dashboard] http://127.0.0.1:${PORT}`);
	});
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
