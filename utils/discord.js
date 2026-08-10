/**
 * Extracts the message ID from a Discord message link or returns the input as-is.
 * Discord links look like: https://discord.com/channels/GUILD_ID/CHANNEL_ID/MESSAGE_ID
 * @param {string} input - Raw option value (message ID or full Discord message link)
 * @returns {string} Message ID to use for DB lookup
 */
function parseMaterialId(input) {
	if (!input || typeof input !== 'string') return input;
	const trimmed = input.trim();
	const match = trimmed.match(/discord\.com\/channels\/\d+\/\d+\/(\d+)$/);
	return match ? match[1] : trimmed;
}

/**
 * Discord dynamic timestamp (`<t:unix:style>`).
 * @param {number|string|Date} ms - Epoch milliseconds (or Date)
 * @param {string} [style='F'] - Discord timestamp style (t/T/d/D/f/F/R)
 * @returns {string}
 */
function discordTs(ms, style = 'F') {
	const value = ms instanceof Date ? ms.getTime() : Number(ms);
	if (!value || !Number.isFinite(value)) return '—';
	return `<t:${Math.floor(value / 1000)}:${style}>`;
}

/**
 * Format elapsed duration parts via a translation key.
 * @param {{ days?: number, hours?: number, minutes?: number, seconds?: number }|null} elapsed
 * @param {{ translate: (key: string, vars?: object) => string }} translations
 * @param {string} key - i18n key (e.g. FOXHOLE_WAR_ELAPSED_VALUE)
 * @returns {string}
 */
function formatElapsed(elapsed, translations, key) {
	if (!elapsed || elapsed.days == null || !translations?.translate || !key) return '—';
	const vars = {
		d: elapsed.days,
		h: elapsed.hours,
		m: elapsed.minutes,
	};
	if (elapsed.seconds != null) vars.s = elapsed.seconds;
	return translations.translate(key, vars);
}

module.exports = { parseMaterialId, discordTs, formatElapsed };
