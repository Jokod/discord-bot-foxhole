const { Events } = require('discord.js');
const { Stats } = require('../data/models.js');
const { getBlockedGuildIds } = require('../utils/blockedGuilds.js');

module.exports = {
	name: Events.GuildCreate,

	/**
	 * @description Executes when the bot joins a guild. Upserts stats with joined_at. Quitte si serveur blacklisté.
	 * @param {import('discord.js').Guild} guild The guild the bot joined.
	 */
	async execute(guild) {
		if (getBlockedGuildIds().has(guild.id)) {
			try {
				await guild.leave();
				console.log(`[Blocked] Bot retiré du serveur ${guild.name} (${guild.id}) juste après l'invitation.`);
			}
			catch (err) {
				console.error(`[Blocked] Impossible de quitter le serveur ${guild.id}:`, err.message);
			}
			return;
		}

		const joinedAt = guild.members.me?.joinedAt ?? new Date();

		await Stats.findOneAndUpdate(
			{ guild_id: guild.id },
			{
				$set: {
					guild_id: guild.id,
					name: guild.name,
					created_at: guild.createdAt,
					joined_at: joinedAt,
					left_at: null,
					member_count: guild.memberCount ?? 0,
				},
			},
			{ upsert: true, returnDocument: 'after' },
		);
	},
};
