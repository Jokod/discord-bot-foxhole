const { Events } = require('discord.js');
const { Stats } = require('../data/models.js');
const { start: startStockpileExpiryScheduler } = require('../utils/stockpileExpiryScheduler.js');
const { getBlockedGuildIds } = require('../utils/blockedGuilds.js');

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

		const blockedGuildIds = getBlockedGuildIds();

		// Quitter les serveurs blacklistés
		for (const [id, guild] of client.guilds.cache) {
			if (blockedGuildIds.has(id)) {
				try {
					await guild.leave();
					console.log(`[Blocked] Bot retiré du serveur ${guild.name} (${id}).`);
				}
				catch (err) {
					console.error(`[Blocked] Impossible de quitter le serveur ${id}:`, err.message);
				}
			}
		}

		// Backfill stats pour les serveurs où le bot est présent (et réinitialiser left_at si rejoint)
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

		// Marquer left_at pour les serveurs en base dont le bot n’est plus membre (recheck au redémarrage)
		const currentGuildIds = Array.from(client.guilds.cache.keys());
		const stillInDb = await Stats.find({
			guild_id: { $nin: currentGuildIds },
			$or: [{ left_at: null }, { left_at: { $exists: false } }],
		});
		const now = new Date();
		for (const stat of stillInDb) {
			await Stats.updateOne(
				{ guild_id: stat.guild_id },
				{ $set: { left_at: now } },
			);
		}
		if (stillInDb.length > 0) {
			console.log(`[Stats] ${stillInDb.length} serveur(s) marqué(s) comme quittés (left_at).`);
		}
	},
};
