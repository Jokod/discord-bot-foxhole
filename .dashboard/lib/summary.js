'use strict';

const path = require('path');
const mongoose = require('mongoose');
const { getWarStatusSummary } = require('../../utils/foxholeWarApi');
const { getBlockedGuildDetails } = require('../../utils/blockedGuilds');

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

function createLoadSummary(envPath) {
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

		const blockedDetails = await getBlockedGuildDetails();

		const mapGuild = (g) => {
			const setup = serverByGuild.get(g.guild_id);
			const blockedSource = blockedDetails.get(g.guild_id) || null;
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
				blocked: Boolean(blockedSource),
				blocked_source: blockedSource,
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
				const target = line.target || 0;
				const current = line.current || 0;
				const priority = line.priority || 'neutral';
				acc.target += target;
				acc.current += current;
				acc.by_priority[priority] = (acc.by_priority[priority] || 0) + 1;
				const done = target > 0 && current >= target;
				if (done) acc.complete += 1;
				return acc;
			},
			{ current: 0, target: 0, complete: 0, by_priority: {} },
		);

		let war = { available: false };
		try {
			war = await getWarStatusSummary();
		}
		catch (err) {
			console.error('[dashboard] war summary failed', err.message || err);
		}

		return {
			generated_at: new Date().toISOString(),
			env_file: path.basename(envPath),
			db_name: mongoose.connection.name || process.env.MONGODB_NAME || null,
			war,
			blocked_guilds: [...blockedDetails.entries()].map(([guild_id, source]) => {
				const fromStats = allStats.find((g) => g.guild_id === guild_id);
				return {
					guild_id,
					source,
					name: fromStats?.name || guild_id,
					member_count: fromStats?.member_count || 0,
					command_count: fromStats?.command_count || 0,
					left_at: fromStats?.left_at || null,
					active: Boolean(fromStats && !fromStats.left_at),
					can_unblacklist: source === 'mongo' || source === 'both',
				};
			}).sort((a, b) => String(a.name).localeCompare(String(b.name))),
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
					{ name: '7d', total: activityCounts['7d'] },
					{ name: '30d', total: activityCounts['30d'] },
					{ name: '90d', total: activityCounts['90d'] },
					{ name: 'older', total: activityCounts.older },
					{ name: 'never', total: activityCounts.never },
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

	return loadSummary;
}

module.exports = {
	MS,
	monthKey,
	fillMonths,
	memberBucket,
	activityBucket,
	topEntries,
	groupCount,
	createLoadSummary,
};
