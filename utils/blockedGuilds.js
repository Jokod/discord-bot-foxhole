/**
 * Liste des IDs de serveurs où le bot ne doit pas rester (env BLOCKED_GUILD_IDS, séparés par des virgules).
 * @returns {Set<string>}
 */
function getBlockedGuildIds() {
	const raw = process.env.BLOCKED_GUILD_IDS || '';
	return new Set(
		raw
			.split(',')
			.map((id) => id.trim())
			.filter(Boolean),
	);
}

module.exports = { getBlockedGuildIds };
