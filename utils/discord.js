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

module.exports = { parseMaterialId };
