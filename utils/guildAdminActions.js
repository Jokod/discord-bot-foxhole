'use strict';

const mongoose = require('mongoose');
const { cleanupGuildData } = require('./guildCleanup');
const {
	getEnvBlockedGuildIds,
	addBlockedGuilds,
	removeBlockedGuilds,
} = require('./blockedGuilds');
const {
	leaveGuildRest,
	sendChannelMessage,
	fetchGuildChannels,
	fetchGuild,
} = require('./discordRest');
const {
	collectKnownChannels,
	loadAnnounceChannelDocs,
	listRestCandidateChannels,
} = require('./announceChannels');

const MAX_GUILDS_PER_REQUEST = 50;
const MAX_MESSAGE_LENGTH = 2000;

/**
 * @param {unknown} ids
 * @returns {string[]}
 */
function normalizeGuildIds(ids) {
	if (!Array.isArray(ids)) return [];
	const out = [];
	const seen = new Set();
	for (const raw of ids) {
		const id = String(raw || '').trim();
		if (!id || seen.has(id)) continue;
		seen.add(id);
		out.push(id);
	}
	return out;
}

/**
 * @param {string[]} guildIds
 */
function assertGuildLimit(guildIds) {
	if (guildIds.length === 0) {
		const err = new Error('No guild ids');
		err.status = 400;
		err.code = 'GUILD_IDS_EMPTY';
		throw err;
	}
	if (guildIds.length > MAX_GUILDS_PER_REQUEST) {
		const err = new Error(`Too many guilds (max ${MAX_GUILDS_PER_REQUEST})`);
		err.status = 400;
		err.code = 'GUILD_IDS_MAX';
		err.params = { max: MAX_GUILDS_PER_REQUEST };
		throw err;
	}
}

/**
 * @param {string} guildId
 * @returns {Promise<string|null>}
 */
async function resolveGuildName(guildId) {
	const db = mongoose.connection?.db;
	if (!db) return null;
	const doc = await db.collection('stats').findOne(
		{ guild_id: guildId },
		{ projection: { name: 1 } },
	);
	return doc?.name || null;
}

/**
 * Leave a guild via REST and cleanup Mongo data.
 * @param {string} guildId
 * @param {{ reason?: string }} [options]
 * @returns {Promise<{ guild_id: string, status: 'ok'|'fail', detail: string, name?: string|null }>}
 */
async function leaveGuild(guildId, options = {}) {
	const name = await resolveGuildName(guildId);
	const reason = options.reason || 'dashboard_leave';
	try {
		await cleanupGuildData(guildId, {
			reason,
			markLeftAt: true,
			guildName: name || guildId,
		});
	}
	catch (err) {
		return {
			guild_id: guildId,
			name,
			status: 'fail',
			detail: `cleanup: ${err.message || err}`,
		};
	}

	const leave = await leaveGuildRest(guildId);
	if (!leave.ok && leave.status !== 404) {
		return {
			guild_id: guildId,
			name,
			status: 'fail',
			detail: `leave HTTP ${leave.status}: ${leave.error || 'failed'}`,
		};
	}
	return {
		guild_id: guildId,
		name,
		status: 'ok',
		detail: leave.status === 404 ? 'already left / not in guild' : 'left',
	};
}

/**
 * @param {string[]} guildIds
 * @param {{ reason?: string, by?: string }} [meta]
 */
async function leaveGuilds(guildIds, meta = {}) {
	const ids = normalizeGuildIds(guildIds);
	assertGuildLimit(ids);
	const results = [];
	for (const id of ids) {
		results.push(await leaveGuild(id, { reason: meta.reason || 'dashboard_leave' }));
	}
	return { results };
}

/**
 * Blacklist (Mongo) + leave + cleanup.
 * @param {string[]} guildIds
 * @param {{ by?: string }} [meta]
 */
async function blacklistGuilds(guildIds, meta = {}) {
	const ids = normalizeGuildIds(guildIds);
	assertGuildLimit(ids);
	await addBlockedGuilds(ids, { reason: 'dashboard_blacklist', by: meta.by || null });
	const results = [];
	for (const id of ids) {
		const row = await leaveGuild(id, { reason: 'dashboard_blacklist' });
		results.push({
			...row,
			detail: row.status === 'ok'
				? `blacklisted; ${row.detail}`
				: row.detail,
		});
	}
	return { results };
}

/**
 * Remove Mongo blacklist. Env-locked IDs stay blocked.
 * @param {string[]} guildIds
 */
async function unblacklistGuilds(guildIds) {
	const ids = normalizeGuildIds(guildIds);
	assertGuildLimit(ids);
	const env = getEnvBlockedGuildIds();
	const { removed, skipped_env, missing } = await removeBlockedGuilds(ids);
	const results = ids.map((id) => {
		if (removed.includes(id) && env.has(id)) {
			return {
				guild_id: id,
				status: 'ok',
				detail: 'removed from mongo; still blocked via env',
			};
		}
		if (removed.includes(id)) {
			return { guild_id: id, status: 'ok', detail: 'unblacklisted' };
		}
		if (skipped_env.includes(id) && !removed.includes(id)) {
			return {
				guild_id: id,
				status: 'skip',
				detail: 'blocked via env only (not removable)',
			};
		}
		if (missing.includes(id)) {
			return { guild_id: id, status: 'skip', detail: 'not blacklisted' };
		}
		return { guild_id: id, status: 'skip', detail: 'unchanged' };
	});
	return { results };
}

/**
 * Broadcast Markdown to guilds via REST.
 * @param {string[]} guildIds
 * @param {string} message
 * @param {{ dry_run?: boolean }} [options]
 */
async function broadcastToGuilds(guildIds, message, options = {}) {
	const ids = normalizeGuildIds(guildIds);
	assertGuildLimit(ids);
	const content = String(message || '').trim();
	if (!content) {
		const err = new Error('Empty message');
		err.status = 400;
		err.code = 'GUILD_MSG_EMPTY';
		throw err;
	}
	if (content.length > MAX_MESSAGE_LENGTH) {
		const err = new Error(`Message too long (max ${MAX_MESSAGE_LENGTH})`);
		err.status = 400;
		err.code = 'GUILD_MSG_LONG';
		err.params = { max: MAX_MESSAGE_LENGTH };
		throw err;
	}

	const dryRun = Boolean(options.dry_run);
	const dbDocs = await loadAnnounceChannelDocs(ids);
	const results = [];

	for (const guildId of ids) {
		const name = await resolveGuildName(guildId);
		const guildRes = await fetchGuild(guildId);
		if (!guildRes.ok) {
			results.push({
				guild_id: guildId,
				name,
				status: 'skip',
				detail: guildRes.status === 404
					? 'bot not in guild'
					: `guild HTTP ${guildRes.status}`,
			});
			continue;
		}

		const channelsRes = await fetchGuildChannels(guildId);
		if (!channelsRes.ok || !Array.isArray(channelsRes.data)) {
			results.push({
				guild_id: guildId,
				name,
				status: 'skip',
				detail: `channels HTTP ${channelsRes.status || '?'}`,
			});
			continue;
		}

		const preferred = collectKnownChannels(dbDocs, guildId);
		const candidates = listRestCandidateChannels(
			channelsRes.data,
			{ system_channel_id: guildRes.data?.system_channel_id },
			preferred,
		);

		if (!candidates.length) {
			results.push({
				guild_id: guildId,
				name,
				status: 'skip',
				detail: 'no sendable channel',
			});
			continue;
		}

		if (dryRun) {
			const preview = candidates.slice(0, 3)
				.map((c) => `#${c.name}(${c.source})`)
				.join(', ');
			results.push({
				guild_id: guildId,
				name,
				status: 'ok',
				detail: `dry-run: try ${candidates.length}: ${preview}`,
			});
			continue;
		}

		let sent = false;
		let lastErr = null;
		for (const cand of candidates) {
			const send = await sendChannelMessage(cand.channel_id, content);
			if (send.ok) {
				results.push({
					guild_id: guildId,
					name,
					status: 'ok',
					detail: `#${cand.name} (${cand.channel_id}, via ${cand.source})`,
				});
				sent = true;
				break;
			}
			lastErr = `HTTP ${send.status}: ${send.error || 'failed'}`;
		}
		if (!sent) {
			results.push({
				guild_id: guildId,
				name,
				status: 'fail',
				detail: broadcastFailDetail(lastErr),
			});
		}
	}

	return { results, dry_run: dryRun };
}

function broadcastFailDetail(lastErr) {
	return lastErr || 'all channels rejected';
}

module.exports = {
	MAX_GUILDS_PER_REQUEST,
	MAX_MESSAGE_LENGTH,
	normalizeGuildIds,
	assertGuildLimit,
	leaveGuild,
	leaveGuilds,
	blacklistGuilds,
	unblacklistGuilds,
	broadcastToGuilds,
	broadcastFailDetail,
};
