'use strict';

const mongoose = require('mongoose');
const { mapUser, discordFetch } = require('../../utils/discordRest');

const contactsCache = { at: 0, data: null };
const CONTACTS_TTL_MS = 5 * 60 * 1000;

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
		const discord = { guild_ok: false, error: null };

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

function resetContactsCacheForTests() {
	contactsCache.at = 0;
	contactsCache.data = null;
}

module.exports = {
	loadContacts,
	bumpCreator,
	resetContactsCacheForTests,
	CONTACTS_TTL_MS,
};
