/** Discord hard limit: 5 action rows × 5 buttons. */
const DISCORD_MAX_BUTTONS_PER_MESSAGE = 25;
/**
 * OAuth2 permissions bitmask for bot invite URLs
 * (View/Send/Embed/History/Manage messages, reactions, threads, slash commands).
 */
const BOT_INVITE_PERMISSIONS = '328565091392';
/**
 * Max active stockpiles shown as reset buttons on `/stockpile list`
 * (Discord: 5 rows × 5 buttons; leave headroom for future UI).
 */
const STOCKPILE_MAX_ACTIVE = 15;
const STOCKPILE_RESET_DURATION_MS = (2 * 24 + 2) * 60 * 60 * 1000;

module.exports = {
	DISCORD_MAX_BUTTONS_PER_MESSAGE,
	BOT_INVITE_PERMISSIONS,
	STOCKPILE_MAX_ACTIVE,
	STOCKPILE_RESET_DURATION_MS,
};

