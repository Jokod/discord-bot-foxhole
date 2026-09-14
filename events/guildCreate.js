const { Events } = require('discord.js');
const { Stats } = require('../data/models.js');
const { getBlockedGuildIds } = require('../utils/blockedGuilds.js');
const { cleanupGuildData } = require('../utils/guildCleanup.js');

module.exports = {
	name: Events.GuildCreate,

	/**
	 * @description Executes when the bot joins a guild. Upserts stats with joined_at. Quitte si serveur blacklisté.
	 * @param {import('discord.js').Guild} guild The guild the bot joined.
	 */
	async execute(guild) {
		const blockedGuildIds = await getBlockedGuildIds();
		if (blockedGuildIds.has(guild.id)) {
			try {
				await cleanupGuildData(guild.id, {
					reason: 'blocked_guild_join',
					markLeftAt: true,
					guildName: guild.name ?? guild.id,
				});
				await guild.leave();
				console.log(`[Blocked] Left guild ${guild.name} (${guild.id}) right after invite.`);
			}
			catch (err) {
				console.error(`[Blocked] Failed to leave guild ${guild.name ?? guild.id} (${guild.id}):`, err.message);
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
					...(guild.ownerId && { owner_id: guild.ownerId }),
				},
			},
			{ upsert: true, returnDocument: 'after' },
		);
		console.log(`[Stats] Joined guild ${guild.name ?? guild.id}.`);
	},
};
