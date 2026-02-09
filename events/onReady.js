const { Events } = require('discord.js');
const { Stats } = require('../data/models.js');

module.exports = {
	name: Events.ClientReady,
	once: true,

	/**
	 * @description Executes when client is ready (bot initialization).
	 * @param {import('../typings').Client} client Main Application Client.
	 */
	async execute(client) {
		console.log(`Logged in as ${client.user.tag}!`);

		// Backfill stats for all guilds the bot is in
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
						...(joinedAt && { joined_at: joinedAt }),
					},
				},
				{ upsert: true, new: true },
			);
		}
	},
};
