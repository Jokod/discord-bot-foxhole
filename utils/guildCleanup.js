const {
	OrderLine,
	OrderBoard,
	Operation,
	NotificationSubscription,
	TrackedMessage,
	Stockpile,
	Server,
	Stats,
} = require('../data/models.js');

/** @param {{ name?: string } | null | undefined} stat */
function hasEmptyStatsName(stat) {
	return !stat?.name;
}

/**
 * Nettoie toutes les données applicatives liées à un serveur.
 * @param {string} guildId
 * @param {{ reason?: string, markLeftAt?: boolean, guildName?: string, ownerId?: string | null }} [options]
 * @returns {Promise<void>}
 */
async function cleanupGuildData(guildId, options = {}) {
	const { reason = 'unknown', markLeftAt = true, guildName, ownerId } = options;
	const now = new Date();

	const [
		linesRes,
		boardsRes,
		operationsRes,
		notificationsRes,
		trackedMessagesRes,
		stockpilesRes,
		serversRes,
	] = await Promise.all([
		OrderLine.deleteMany({ guild_id: guildId }),
		OrderBoard.deleteMany({ guild_id: guildId }),
		Operation.deleteMany({ guild_id: guildId }),
		NotificationSubscription.deleteMany({ guild_id: guildId }),
		TrackedMessage.deleteMany({ server_id: guildId }),
		Stockpile.deleteMany({ server_id: guildId }),
		Server.deleteMany({ guild_id: guildId }),
	]);

	if (markLeftAt) {
		const existing = await Stats.findOne({ guild_id: guildId });
		if (existing) {
			if (hasEmptyStatsName(existing)) {
				await Stats.deleteOne({ guild_id: guildId });
			}
			else {
				const $set = { left_at: now };
				if (guildName) $set.name = guildName;
				if (ownerId) $set.owner_id = ownerId;
				await Stats.updateOne({ guild_id: guildId }, { $set });
			}
		}
	}

	const displayName = guildName ? `${guildName} (id=${guildId})` : guildId;
	console.log(
		`[Cleanup] ${displayName} reason=${reason} — ` +
		`orderLines=${linesRes.deletedCount ?? 0}, ` +
		`orderBoards=${boardsRes.deletedCount ?? 0}, ` +
		`operations=${operationsRes.deletedCount ?? 0}, notifications=${notificationsRes.deletedCount ?? 0}, ` +
		`trackedMessages=${trackedMessagesRes.deletedCount ?? 0}, stockpiles=${stockpilesRes.deletedCount ?? 0}, ` +
		`servers=${serversRes.deletedCount ?? 0}.`,
	);
}

/**
 * @returns {Promise<number>}
 */
async function purgeEmptyStatsRecords() {
	const result = await Stats.deleteMany({
		$or: [{ name: '' }, { name: null }],
	});
	return result.deletedCount ?? 0;
}

module.exports = { cleanupGuildData, purgeEmptyStatsRecords, hasEmptyStatsName };
