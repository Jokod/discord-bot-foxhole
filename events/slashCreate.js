const { Events } = require('discord.js');
const { Server } = require('../data/models.js');

module.exports = {
	name: Events.InteractionCreate,

	/**
	 * @description Executes when an interaction is created and handle it.

	 * @param {import('discord.js').CommandInteraction & { client: import('../typings').Client }} interaction The interaction which was created
	 */

	async execute(interaction) {
		// Deconstructed client from interaction object.
		const { client } = interaction;

		// Checks if the interaction is a command (to prevent weird bugs)

		if (!interaction.isChatInputCommand()) return;

		const command = client.slashCommands.get(interaction.commandName);

		// If the interaction is not a command in cache.

		if (!command) return;

		if (command.init && !(await Server.findOne({ guild_id: interaction.guild.id }))) {
			return interaction.reply({
				content: 'This server is not initialized, please run the `/setup` command.',
				ephemeral: true,
			});
		}

		// A try to executes the interaction.

		try {
			await command.execute(interaction);
		}
		catch (err) {
			console.error(err);
			await interaction.reply({
				content: 'An error occured while executing the command.',
				ephemeral: true,
			});
		}
	},
};
