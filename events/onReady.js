const { Events } = require('discord.js');
const {
	Stats,
	Server,
	OrderLine,
	OrderBoard,
	Operation,
	NotificationSubscription,
	TrackedMessage,
	Stockpile,
} = require('../data/models.js');
const { start: startStockpileExpiryScheduler } = require('../utils/stockpileExpiryScheduler.js');
const { syncAllStockpileLists } = require('../utils/stockpileListSync.js');
const { getBlockedGuildIds } = require('../utils/blockedGuilds.js');
const { cleanupGuildData, purgeEmptyStatsRecords } = require('../utils/guildCleanup.js');

module.exports = {
	name: Events.ClientReady,
	once: true,

	/**
	 * @description Executes when client is ready (bot initialization).
	 * @param {import('../typings').Client} client Main Application Client.
	 */
	async execute(client) {
		console.log(`Logged in as ${client.user.tag}!`);

		startStockpileExpiryScheduler(client);
		void syncAllStockpileLists(client).catch((err) => {
			console.error('[StockpileList] Échec de la synchronisation au démarrage:', err);
		});

		try {
			const { syncAllOrderBoards } = require('../utils/orderBoardSync.js');
			void syncAllOrderBoards(client).catch((err) => {
				console.error('[OrderBoard] Échec de la synchronisation au démarrage:', err);
			});
		}
		catch (err) {
			console.error('[OrderBoard] syncAllOrderBoards indisponible:', err.message);
		}

		const purgedStats = await purgeEmptyStatsRecords();
		if (purgedStats > 0) {
			console.log(`[Stats] ${purgedStats} fiche(s) Stats sans nom supprimée(s).`);
		}

		const blockedGuildIds = await getBlockedGuildIds();
		const currentGuildIds = Array.from(client.guilds.cache.keys());

		for (const [id, guild] of client.guilds.cache) {
			if (blockedGuildIds.has(id)) {
				try {
					await cleanupGuildData(id, {
						reason: 'blocked_guild_on_ready',
						markLeftAt: true,
						guildName: guild.name ?? id,
					});
					await guild.leave();
					console.log(`[Blocked] Bot retiré du serveur ${guild.name} (${id}).`);
				}
				catch (err) {
					console.error(`[Blocked] Impossible de quitter le serveur ${id}:`, err.message);
				}
			}
		}

		for (const [id, guild] of client.guilds.cache) {
			const joinedAt = guild.joinedAt ?? guild.members.me?.joinedAt ?? null;

			await Stats.findOneAndUpdate(
				{ guild_id: id },
				{
					$set: {
						guild_id: id,
						name: guild.name,
						created_at: guild.createdAt,
						member_count: guild.memberCount ?? 0,
						left_at: null,
						...(joinedAt && { joined_at: joinedAt }),
						...(guild.ownerId && { owner_id: guild.ownerId }),
					},
				},
				{ upsert: true, returnDocument: 'after' },
			);
		}

		const [
			serverIds,
			lineIds,
			boardIds,
			operationIds,
			notifIds,
			trackedIds,
			stockpileIds,
			statsLeftIds,
		] = await Promise.all([
			Server.distinct('guild_id', { guild_id: { $nin: currentGuildIds } }),
			OrderLine.distinct('guild_id', { guild_id: { $nin: currentGuildIds } }),
			OrderBoard.distinct('guild_id', { guild_id: { $nin: currentGuildIds } }),
			Operation.distinct('guild_id', { guild_id: { $nin: currentGuildIds } }),
			NotificationSubscription.distinct('guild_id', { guild_id: { $nin: currentGuildIds } }),
			TrackedMessage.distinct('server_id', { server_id: { $nin: currentGuildIds } }),
			Stockpile.distinct('server_id', { server_id: { $nin: currentGuildIds } }),
			Stats.distinct('guild_id', { guild_id: { $nin: currentGuildIds }, left_at: null }),
		]);

		const orphanedIds = new Set([
			...serverIds, ...lineIds, ...boardIds, ...operationIds,
			...notifIds, ...trackedIds, ...stockpileIds, ...statsLeftIds,
		]);

		if (orphanedIds.size > 0) {
			const statsForOrphans = await Stats.find({ guild_id: { $in: Array.from(orphanedIds) } });
			const nameMap = new Map(statsForOrphans.map((s) => [s.guild_id, s.name]));

			for (const guildId of orphanedIds) {
				await cleanupGuildData(guildId, {
					reason: 'orphaned_on_ready',
					markLeftAt: true,
					guildName: nameMap.get(guildId),
				});
			}

			console.log(`[Stats] ${orphanedIds.size} serveur(s) orphelin(s) nettoyé(s) au démarrage.`);
		}
	},
};
