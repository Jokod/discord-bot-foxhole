const { Events } = require('discord.js');
const { cleanupGuildData } = require('../utils/guildCleanup.js');

module.exports = {
	name: Events.GuildDelete,

	/**
	 * @description Executes when the bot is removed from a guild (kick or server delete).
	 * @param {import('discord.js').Guild} guild The guild the bot left.
	 */
	async execute(guild) {
		try {
			await cleanupGuildData(guild.id, {
				reason: 'guild_delete',
				markLeftAt: true,
				guildName: guild.name ?? guild.id,
			});
			console.log(`[Stats] Bot retiré du serveur ${guild.name ?? guild.id}, nettoyage effectué.`);
		}
		catch (err) {
			console.error(`[Stats] Impossible de nettoyer les données pour ${guild.id}:`, err.message);
		}
	},
};

