const { Events } = require('discord.js');
const { Server } = require('../data/models.js');
const Logs = require('../utils/logs.js');

module.exports = {
	name: Events.InteractionCreate,
	async execute(interaction) {
		const { client, guild } = interaction;
		const guildId = guild.id;

		new Logs(interaction).write();

		const server = await Server.findOne({ guild_id: guildId });

		const lang = server?.lang || 'en';

		if (!server) {
			console.log(`[ERROR] Server "${guildId}" not found or language not defined.`);
		}

		client.traductions.set(guildId, lang);
	},
};
