const { Events } = require('discord.js');
const { Server } = require('../data/models.js');
const Translate = require('../utils/translations.js');

module.exports = {
	name: Events.InteractionCreate,

	/**
	 * @description Executes when an interaction is created and handle it.

	 * @param {import('discord.js').ContextMenuCommandInteraction & { client: import('../typings').Client }} interaction The interaction which was created
	 */

	execute: async (interaction) => {
		// Deconstructed client from interaction object.
		const { client } = interaction;
		const guildId = interaction.guild.id;
		const translations = new Translate(client, guildId);

		// Checks if the interaction is a context interaction (to prevent weird bugs)

		if (!interaction.isContextMenuCommand()) return;

		/** ********************************************************************/

		// Checks if the interaction target was a user

		if (interaction.isUserContextMenuCommand()) {
			const command = client.contextCommands.get(
				'USER ' + interaction.commandName,
			);

			const server = await Server.findOne({ guild_id: guildId });

			if (command.init && !server) {
				return interaction.reply({
					content: translations.translate('SERVER_IS_NOT_INIT'),
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
					content: translations.translate('COMMAND_EXECUTE_ERROR'),
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
					content: translations.translate('COMMAND_EXECUTE_ERROR'),
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
