/**
 * Normalise une chaîne région ou ville pour le stockage en BDD (format standardisé).
 * @param {string} value - Région ou ville saisie
 * @returns {string} Chaîne trimée en title case (ex: "the salt farms" → "The Salt Farms")
 */
function normalizeForDb(value) {
	if (!value || typeof value !== 'string') return '';
	return value
		.trim()
		.replace(/-/g, ' ')
		.split(/\s+/)
		.filter(Boolean)
		.map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
		.join(' ');
}

/**
 * Formate une région ou ville pour l'affichage (visuel uniquement).
 * @param {string} value - Valeur en BDD
 * @returns {string} Chaîne formatée pour l'affichage
 */
function formatForDisplay(value) {
	if (!value || typeof value !== 'string') return '';
	return normalizeForDb(value);
}

module.exports = {
	normalizeForDb,
	formatForDisplay,
};
