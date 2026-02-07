/**
 * Generates a random color for Discord embeds
 * @returns {number} Random color in hexadecimal format
 */
function getRandomColor() {
	return Math.floor(Math.random() * 0xFFFFFF);
}

module.exports = { getRandomColor };
