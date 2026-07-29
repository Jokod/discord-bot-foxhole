const { Events } = require('discord.js');
const { Server } = require('../data/models.js');

module.exports = {
	name: Events.InteractionCreate,

	/**
	 * @description Executes when an interaction is created and handle it.

	 * @param {import('discord.js').AutocompleteInteraction & { client: import('../typings').Client }} interaction The interaction which was created
	 */

	async execute(interaction) {
		if (!interaction.isAutocomplete()) return;
		if (!interaction.guild) {
			return interaction.respond([]).catch(() => undefined);
		}

		const { client } = interaction;
		const guildId = interaction.guild.id;

		const request = client.autocompleteInteractions.get(
			interaction.commandName,
		);

		if (!request) return;

		const server = await Server.findOne({ guild_id: guildId });

		if (request.init && !server) {
			return interaction.respond([]);
		}

		try {
			await request.execute(interaction);
		}
		catch (err) {
			console.error(err);
			if (!interaction.responded) {
				await interaction.respond([]).catch(() => undefined);
			}
		}
	},
};
