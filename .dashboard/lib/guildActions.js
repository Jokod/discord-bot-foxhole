'use strict';

const {
	leaveGuilds,
	blacklistGuilds,
	unblacklistGuilds,
	broadcastToGuilds,
	MAX_GUILDS_PER_REQUEST,
	MAX_MESSAGE_LENGTH,
} = require('../../utils/guildAdminActions');

function parseGuildIds(body) {
	return body?.guild_ids;
}

async function handleLeave(body) {
	return leaveGuilds(parseGuildIds(body), { reason: 'dashboard_leave' });
}

async function handleBlacklist(body, username) {
	return blacklistGuilds(parseGuildIds(body), { by: username || null });
}

async function handleUnblacklist(body) {
	return unblacklistGuilds(parseGuildIds(body));
}

async function handleBroadcast(body) {
	return broadcastToGuilds(parseGuildIds(body), body?.message, {
		dry_run: Boolean(body?.dry_run),
	});
}

module.exports = {
	handleLeave,
	handleBlacklist,
	handleUnblacklist,
	handleBroadcast,
	MAX_GUILDS_PER_REQUEST,
	MAX_MESSAGE_LENGTH,
};
