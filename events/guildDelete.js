const { Events } = require('discord.js');
const { Stats } = require('../data/models.js');

module.exports = {
	name: Events.GuildDelete,

	/**
	 * @description Executes when the bot is removed from a guild (kick or server delete).
	 * @param {import('discord.js').Guild} guild The guild the bot left.
	 */
	async execute(guild) {
		try {
			await Stats.updateOne(
				{ guild_id: guild.id },
				{
					$set: {
						left_at: new Date(),
					},
				},
			);

			console.log(`[Stats] Bot retiré du serveur ${guild.name ?? guild.id}, left_at mis à jour.`);
		}
		catch (err) {
			console.error(`[Stats] Impossible de mettre à jour left_at pour ${guild.id}:`, err.message);
		}
	},
};

