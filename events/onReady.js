const { Events } = require('discord.js');
const {
	Stats,
	Server,
	Material,
	Group,
	Operation,
	NotificationSubscription,
	TrackedMessage,
	Stockpile,
} = require('../data/models.js');
const { start: startStockpileExpiryScheduler } = require('../utils/stockpileExpiryScheduler.js');
const { syncAllStockpileLists } = require('../utils/stockpileListSync.js');
const { getBlockedGuildIds } = require('../utils/blockedGuilds.js');
const { cleanupGuildData } = require('../utils/guildCleanup.js');

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

		const blockedGuildIds = getBlockedGuildIds();
		const currentGuildIds = Array.from(client.guilds.cache.keys());

		// Quitter les serveurs blacklistés
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

		// Backfill stats pour les serveurs actifs (et réinitialiser left_at)
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
					},
				},
				{ upsert: true, returnDocument: 'after' },
			);
		}

		// Chercher tous les guild_ids orphelins directement dans chaque collection de données.
		// Ne pas s'appuyer uniquement sur Stats : un serveur peut avoir des données sans doc Stats
		// ou avec Stats.left_at=null (guildDelete manqué quand le bot était offline).
		const [
			serverIds,
			materialIds,
			groupIds,
			operationIds,
			notifIds,
			trackedIds,
			stockpileIds,
			statsLeftIds,
		] = await Promise.all([
			Server.distinct('guild_id', { guild_id: { $nin: currentGuildIds } }),
			Material.distinct('guild_id', { guild_id: { $nin: currentGuildIds } }),
			Group.distinct('guild_id', { guild_id: { $nin: currentGuildIds } }),
			Operation.distinct('guild_id', { guild_id: { $nin: currentGuildIds } }),
			NotificationSubscription.distinct('guild_id', { guild_id: { $nin: currentGuildIds } }),
			TrackedMessage.distinct('server_id', { server_id: { $nin: currentGuildIds } }),
			Stockpile.distinct('server_id', { server_id: { $nin: currentGuildIds } }),
			// Stats actifs (left_at null) alors que le bot n'est plus sur le serveur (guildDelete manqué)
			Stats.distinct('guild_id', { guild_id: { $nin: currentGuildIds }, left_at: null }),
		]);

		const orphanedIds = new Set([
			...serverIds, ...materialIds, ...groupIds, ...operationIds,
			...notifIds, ...trackedIds, ...stockpileIds, ...statsLeftIds,
		]);

		if (orphanedIds.size > 0) {
			// Récupérer les noms depuis Stats en un seul appel
			const statsForOrphans = await Stats.find({ guild_id: { $in: Array.from(orphanedIds) } });
			const nameMap = new Map(statsForOrphans.map((s) => [s.guild_id, s.name]));

			for (const guildId of orphanedIds) {
				await cleanupGuildData(guildId, {
					reason: 'orphaned_on_ready',
					markLeftAt: true,
					guildName: nameMap.get(guildId) || guildId,
				});
			}

			console.log(`[Stats] ${orphanedIds.size} serveur(s) orphelin(s) nettoyé(s) au démarrage.`);
		}
	},
};
