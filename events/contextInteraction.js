const { Events } = require('discord.js');
const { Server } = require('../data/models.js');

module.exports = {
	name: Events.InteractionCreate,

	/**
	 * @description Executes when an interaction is created and handle it.

	 * @param {import('discord.js').ContextMenuCommandInteraction & { client: import('../typings').Client }} interaction The interaction which was created
	 */

	execute: async (interaction) => {
		// Deconstructed client from interaction object.
		const { client } = interaction;

		// Checks if the interaction is a context interaction (to prevent weird bugs)

		if (!interaction.isContextMenuCommand()) return;

		/** ********************************************************************/

		// Checks if the interaction target was a user

		if (interaction.isUserContextMenuCommand()) {
			const command = client.contextCommands.get(
				'USER ' + interaction.commandName,
			);

			if (command.init && !(await Server.findOne({ guild_id: interaction.guild.id }))) {
				return interaction.reply({
					content: 'This server is not initialized, please run the `/setup` command.',
					ephemeral: true,
				});
			}

			// A try to execute the interaction.

			try {
				return await command.execute(interaction);
			}
			catch (err) {
				console.error(err);
				await interaction.reply({
					content: 'An error occured while executing the command.',
					ephemeral: true,
				});
			}
		}
		// Checks if the interaction target was a message
		else if (interaction.isMessageContextMenuCommand()) {
			const command = client.contextCommands.get(
				'MESSAGE ' + interaction.commandName,
			);

			// A try to execute the interaction.

			try {
				return await command.execute(interaction);
			}
			catch (err) {
				console.error(err);
				await interaction.reply({
					content: 'An error occured while executing the command.',
					ephemeral: true,
				});
			}
		}

		// Practically not possible, but we are still caching the bug.
		// Possible Fix is a restart!
		else {
			return console.log(
				'An error occured while executing the context command.',
			);
		}
	},
};
