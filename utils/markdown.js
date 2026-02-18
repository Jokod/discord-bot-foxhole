const { escapeMarkdown } = require('discord.js');

/**
 * Escape Markdown Discord de façon sûre pour des données utilisateur.
 * Retourne toujours une chaîne (jamais null/undefined).
 * @param {unknown} value
 * @returns {string}
 */
function safeEscapeMarkdown(value) {
	if (value === null || value === undefined) return '';
	const str = typeof value === 'string' ? value : String(value);
	if (!str) return '';
	return escapeMarkdown(str);
}

module.exports = { safeEscapeMarkdown };

