/** Discord hard limit: 5 action rows × 5 buttons. */
const DISCORD_MAX_BUTTONS_PER_MESSAGE = 25;
/**
 * Stockpile list UI: 3 rows for reset buttons after reserving
 * remove-select + admin (cleanup / delete all).
 */
const STOCKPILE_MAX_ACTIVE = 15;
const STOCKPILE_RESET_DURATION_MS = (2 * 24 + 2) * 60 * 60 * 1000;

module.exports = {
	DISCORD_MAX_BUTTONS_PER_MESSAGE,
	STOCKPILE_MAX_ACTIVE,
	STOCKPILE_RESET_DURATION_MS,
};

