const { Events } = require('discord.js');
const { Server } = require('../data/models.js');

module.exports = {
	name: Events.InteractionCreate,

	/**
	 * @description Executes when an interaction is created and handle it.

	 * @param {import('discord.js').AutocompleteInteraction & { client: import('../typings.js').Client }} interaction The interaction which was created
	 */

	async execute(interaction) {
		const { client } = interaction;
		const guildId = interaction.guild.id;

		const server = await Server.findOne({ guild_id: guildId });

		const lang = server?.lang || 'en';

		if (!server) {
			console.log(`[ERROR] Server "${guildId}" not found or language not defined.`);
		}

		client.traductions.set(guildId, lang);
	},
};
