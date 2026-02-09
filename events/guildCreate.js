const { Events } = require('discord.js');
const { Stats } = require('../data/models.js');

module.exports = {
	name: Events.GuildCreate,

	/**
	 * @description Executes when the bot joins a guild. Upserts stats with joined_at.
	 * @param {import('discord.js').Guild} guild The guild the bot joined.
	 */
	async execute(guild) {
		const joinedAt = guild.members.me?.joinedAt ?? new Date();

		await Stats.findOneAndUpdate(
			{ guild_id: guild.id },
			{
				$set: {
					guild_id: guild.id,
					name: guild.name,
					created_at: guild.createdAt,
					joined_at: joinedAt,
					member_count: guild.memberCount ?? 0,
				},
			},
			{ upsert: true, new: true },
		);
	},
};
