const {
	Material,
	Group,
	Operation,
	NotificationSubscription,
	TrackedMessage,
	Stockpile,
	Server,
	Stats,
} = require('../data/models.js');

/**
 * Nettoie toutes les données applicatives liées à un serveur.
 * @param {string} guildId
 * @param {{ reason?: string, markLeftAt?: boolean, guildName?: string }} [options]
 * @returns {Promise<void>}
 */
async function cleanupGuildData(guildId, options = {}) {
	const { reason = 'unknown', markLeftAt = true, guildName } = options;
	const now = new Date();

	await Promise.all([
		Material.deleteMany({ guild_id: guildId }),
		Group.deleteMany({ guild_id: guildId }),
		Operation.deleteMany({ guild_id: guildId }),
		NotificationSubscription.deleteMany({ guild_id: guildId }),
		TrackedMessage.deleteMany({ server_id: guildId }),
		Stockpile.deleteMany({ server_id: guildId }),
		Server.deleteMany({ guild_id: guildId }),
		markLeftAt
			? Stats.updateOne(
				{ guild_id: guildId },
				{ $set: { left_at: now } },
				{ upsert: true },
			)
			: Promise.resolve(),
	]);

	const displayName = guildName || guildId;
	console.log(`[Cleanup] Données supprimées pour le serveur ${displayName} (reason=${reason}, markLeftAt=${markLeftAt}).`);
}

module.exports = { cleanupGuildData };
