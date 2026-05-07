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

	const [
		materialsRes,
		groupsRes,
		operationsRes,
		notificationsRes,
		trackedMessagesRes,
		stockpilesRes,
		serversRes,
	] = await Promise.all([
		Material.deleteMany({ guild_id: guildId }),
		Group.deleteMany({ guild_id: guildId }),
		Operation.deleteMany({ guild_id: guildId }),
		NotificationSubscription.deleteMany({ guild_id: guildId }),
		TrackedMessage.deleteMany({ server_id: guildId }),
		Stockpile.deleteMany({ server_id: guildId }),
		Server.deleteMany({ guild_id: guildId }),
	]);

	if (markLeftAt) {
		await Stats.updateOne(
			{ guild_id: guildId },
			{ $set: { left_at: now } },
			{ upsert: true },
		);
	}

	const displayName = guildName || guildId;
	console.log(
		`[Cleanup] Données supprimées pour le serveur ${displayName} (reason=${reason}, markLeftAt=${markLeftAt}) ` +
		`materials=${materialsRes.deletedCount ?? 0}, groups=${groupsRes.deletedCount ?? 0}, ` +
		`operations=${operationsRes.deletedCount ?? 0}, notifications=${notificationsRes.deletedCount ?? 0}, ` +
		`trackedMessages=${trackedMessagesRes.deletedCount ?? 0}, stockpiles=${stockpilesRes.deletedCount ?? 0}, ` +
		`servers=${serversRes.deletedCount ?? 0}.`,
	);
}

module.exports = { cleanupGuildData };
