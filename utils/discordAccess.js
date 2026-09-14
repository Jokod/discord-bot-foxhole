const { PermissionFlagsBits } = require('discord.js');
const { BOT_INVITE_PERMISSIONS } = require('./constants.js');

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
	if (code != null && CHANNEL_ACCESS_ERROR_CODES.has(code)) return true;
	// Some wrappers only surface the Discord message string.
	const msg = err && typeof err === 'object' && typeof err.message === 'string'
		? err.message
		: '';
	return /missing access|missing permissions/i.test(msg);
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

/** Unknown interaction — token expired / already handled (3s window). */
const UNKNOWN_INTERACTION_ERROR_CODE = 10062;
/** Interaction has already been acknowledged. */
const INTERACTION_ALREADY_ACKED_ERROR_CODE = 40060;

/**
 * Interaction can no longer receive a response (timeout or double-ack).
 * @param {unknown} err
 * @returns {boolean}
 */
function isExpiredInteractionError(err) {
	const code = getDiscordErrorCode(err);
	return code === UNKNOWN_INTERACTION_ERROR_CODE
		|| code === INTERACTION_ALREADY_ACKED_ERROR_CODE;
}

/**
 * OAuth2 invite URL with the recommended bot permission bitmask.
 * @param {string} [clientId=process.env.CLIENT_ID]
 * @returns {string|null}
 */
function buildBotInviteUrl(clientId = process.env.CLIENT_ID) {
	const id = typeof clientId === 'string' ? clientId.trim() : '';
	if (!id) return null;
	return `https://discord.com/api/oauth2/authorize?client_id=${id}&permissions=${BOT_INVITE_PERMISSIONS}&scope=bot%20applications.commands`;
}

/**
 * Localized ephemeral text for Missing Access, including the re-invite link when possible.
 * @param {{ translate: (key: string, params?: object) => string }} translations
 * @returns {string}
 */
function missingChannelAccessText(translations) {
	const url = buildBotInviteUrl();
	return translations.translate('BOT_MISSING_CHANNEL_ACCESS', {
		url: url || 'https://discord.com/developers/applications',
	});
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
	UNKNOWN_INTERACTION_ERROR_CODE,
	INTERACTION_ALREADY_ACKED_ERROR_CODE,
	getDiscordErrorCode,
	isMissingAccessError,
	isUnknownMessageError,
	isExpiredInteractionError,
	buildBotInviteUrl,
	missingChannelAccessText,
	botCanPostInChannel,
};
