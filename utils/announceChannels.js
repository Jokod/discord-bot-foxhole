'use strict';

const mongoose = require('mongoose');

/** Discord channel types: GUILD_TEXT=0, GUILD_ANNOUNCEMENT=5 */
const TEXT_CHANNEL_TYPES = new Set([0, 5]);

/**
 * Collect preferred channel IDs from known bot documents for a guild.
 * @param {{
 *   notifs?: Array<{guild_id?: string, channel_id?: string}>,
 *   tracked?: Array<{server_id?: string, channel_id?: string}>,
 *   boards?: Array<{guild_id?: string, channel_id?: string}>,
 *   stockpiles?: Array<{server_id?: string, channel_id?: string, group_id?: string}>,
 *   operations?: Array<{guild_id?: string, channel_id?: string}>,
 * }} dbDocs
 * @param {string} guildId
 * @returns {string[]}
 */
function collectKnownChannels(dbDocs, guildId) {
	const ids = [];
	const push = (id) => {
		if (id && !ids.includes(id)) ids.push(String(id));
	};
	for (const n of dbDocs.notifs || []) {
		if (n.guild_id === guildId) push(n.channel_id);
	}
	for (const t of dbDocs.tracked || []) {
		if (t.server_id === guildId) push(t.channel_id);
	}
	for (const b of dbDocs.boards || []) {
		if (b.guild_id === guildId) push(b.channel_id);
	}
	for (const s of dbDocs.stockpiles || []) {
		if (s.server_id === guildId) push(s.channel_id || s.group_id);
	}
	for (const o of dbDocs.operations || []) {
		if (o.guild_id === guildId) push(o.channel_id);
	}
	return ids;
}

/**
 * Load channel-related docs for the given guild IDs from Mongo.
 * @param {string[]} guildIds
 * @returns {Promise<{
 *   notifs: object[],
 *   tracked: object[],
 *   boards: object[],
 *   stockpiles: object[],
 *   operations: object[],
 * }>}
 */
async function loadAnnounceChannelDocs(guildIds) {
	const db = mongoose.connection?.db;
	if (!db || !guildIds.length) {
		return { notifs: [], tracked: [], boards: [], stockpiles: [], operations: [] };
	}
	const [notifs, tracked, boards, stockpiles, operations] = await Promise.all([
		db.collection('notificationsubscriptions').find({ guild_id: { $in: guildIds } })
			.project({ guild_id: 1, channel_id: 1 }).toArray(),
		db.collection('trackedmessages').find({ server_id: { $in: guildIds } })
			.project({ server_id: 1, channel_id: 1 }).toArray(),
		db.collection('orderboards').find({ guild_id: { $in: guildIds } })
			.project({ guild_id: 1, channel_id: 1 }).toArray(),
		db.collection('stockpiles').find({ server_id: { $in: guildIds }, deleted: { $ne: true } })
			.project({ server_id: 1, channel_id: 1, group_id: 1 }).toArray(),
		db.collection('operations').find({
			guild_id: { $in: guildIds },
			channel_id: { $exists: true, $nin: [null, ''] },
		}).project({ guild_id: 1, channel_id: 1 }).toArray(),
	]);
	return { notifs, tracked, boards, stockpiles, operations };
}

/**
 * Build ordered candidate channel descriptors from REST channel list + guild meta.
 * Used by dashboard (REST) and can inform CLI selection order.
 *
 * @param {Array<{id: string, name?: string, type: number, position?: number}>} channels
 * @param {{ system_channel_id?: string|null }} guild
 * @param {string[]} preferredIds
 * @returns {Array<{ channel_id: string, name: string, source: string }>}
 */
function listRestCandidateChannels(channels, guild, preferredIds) {
	const byId = new Map((channels || []).map((c) => [String(c.id), c]));
	const out = [];
	const seen = new Set();

	const add = (ch, source) => {
		if (!ch || seen.has(String(ch.id))) return;
		if (!TEXT_CHANNEL_TYPES.has(Number(ch.type))) return;
		seen.add(String(ch.id));
		out.push({
			channel_id: String(ch.id),
			name: ch.name || ch.id,
			source,
		});
	};

	for (const id of preferredIds || []) {
		add(byId.get(String(id)), 'db');
	}

	if (guild?.system_channel_id) {
		add(byId.get(String(guild.system_channel_id)), 'system');
	}

	const text = (channels || [])
		.filter((c) => TEXT_CHANNEL_TYPES.has(Number(c.type)))
		.sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
	for (const ch of text) {
		add(ch, 'first-text');
	}

	return out;
}

/**
 * discord.js Client path (CLI announce script).
 * @param {import('discord.js').Guild} guild
 * @param {string[]} preferredIds
 * @param {(channel: import('discord.js').GuildBasedChannel, me: import('discord.js').GuildMember|null) => boolean} canSend
 * @param {typeof import('discord.js').ChannelType} ChannelType
 * @returns {Array<{ channel: import('discord.js').GuildBasedChannel, source: string }>}
 */
function listDiscordJsCandidateChannels(guild, preferredIds, canSend, ChannelType) {
	const out = [];
	const seen = new Set();
	const me = guild.members.me;
	const add = (channel, source) => {
		if (!channel || seen.has(channel.id) || !canSend(channel, me)) return;
		seen.add(channel.id);
		out.push({ channel, source });
	};

	for (const id of preferredIds) {
		add(guild.channels.cache.get(id), 'db');
	}

	if (guild.systemChannelId) {
		add(guild.channels.cache.get(guild.systemChannelId), 'system');
	}

	const text = [...guild.channels.cache.values()]
		.filter((c) => c.type === ChannelType.GuildText || c.type === ChannelType.GuildAnnouncement)
		.sort((a, b) => a.rawPosition - b.rawPosition);
	for (const ch of text) {
		add(ch, 'first-text');
	}

	return out;
}

module.exports = {
	TEXT_CHANNEL_TYPES,
	collectKnownChannels,
	loadAnnounceChannelDocs,
	listRestCandidateChannels,
	listDiscordJsCandidateChannels,
};
