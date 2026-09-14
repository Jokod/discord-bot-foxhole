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
				ownerId: guild.ownerId ?? null,
			});
			console.log(`[Stats] Left guild ${guild.name ?? guild.id}, cleanup done.`);
		}
		catch (err) {
			console.error(`[Stats] Failed to clean data for ${guild.name ?? guild.id} (${guild.id}):`, err.message);
		}
	},
};

