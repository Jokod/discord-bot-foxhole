const { PermissionFlagsBits } = require('discord.js');

/**
 * Discord JSON error codes that mean the bot cannot act in the channel.
 * 50001 Missing Access, 50013 Missing Permissions, 50008 non-text channel.
 */
const CHANNEL_ACCESS_ERROR_CODES = new Set([
	50001,
	50013,
	50008,
]);

/**
 * @param {unknown} err
 * @returns {number | null}
 */
function getDiscordErrorCode(err) {
	if (!err || typeof err !== 'object') return null;
	const code = err.code;
	const rawCode = err.rawError?.code;
	if (typeof code === 'number') return code;
	if (typeof rawCode === 'number') return rawCode;
	return null;
}

/**
 * DiscordAPIError / REST: bot cannot access or act in the target channel.
 * @param {unknown} err
 * @returns {boolean}
 */
function isMissingAccessError(err) {
	const code = getDiscordErrorCode(err);
	return code != null && CHANNEL_ACCESS_ERROR_CODES.has(code);
}

/** Unknown Message — message was deleted or never existed. */
const UNKNOWN_MESSAGE_ERROR_CODE = 10008;

/**
 * @param {unknown} err
 * @returns {boolean}
 */
function isUnknownMessageError(err) {
	return getDiscordErrorCode(err) === UNKNOWN_MESSAGE_ERROR_CODE;
}

/**
 * Whether the bot can post a normal message (optionally with embeds) in this channel.
 * Defaults to embeds=false (Components V2 does not require EmbedLinks).
 * @param {import('discord.js').GuildBasedChannel | import('discord.js').TextBasedChannel | null | undefined} channel
 * @param {import('discord.js').Guild | null | undefined} guild
 * @param {{ embeds?: boolean }} [options]
 * @returns {boolean}
 */
function botCanPostInChannel(channel, guild, options = {}) {
	const { embeds = false } = options;
	if (!channel || typeof channel.isTextBased !== 'function' || !channel.isTextBased()) {
		return false;
	}
	const me = guild?.members?.me;
	if (!me) return true;

	const perms = typeof channel.permissionsFor === 'function'
		? channel.permissionsFor(me)
		: null;
	if (!perms) return true;

	if (!perms.has(PermissionFlagsBits.ViewChannel) || !perms.has(PermissionFlagsBits.SendMessages)) {
		return false;
	}
	if (embeds && !perms.has(PermissionFlagsBits.EmbedLinks)) {
		return false;
	}
	return true;
}

module.exports = {
	CHANNEL_ACCESS_ERROR_CODES,
	UNKNOWN_MESSAGE_ERROR_CODE,
	getDiscordErrorCode,
	isMissingAccessError,
	isUnknownMessageError,
	botCanPostInChannel,
};
