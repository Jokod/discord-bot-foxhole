const { Events } = require('discord.js');
const { Server } = require('../data/models.js');
const Translate = require('../utils/translations.js');
const { getPrefix } = require('../shared/customId.js');

module.exports = {
	name: Events.InteractionCreate,

	/**
	 * @description Executes when an interaction is created and handle it.

	 * @param {import('discord.js').ButtonInteraction & { client: import('../typings').Client }} interaction The interaction which was created
	 */

	async execute(interaction) {
		if (!interaction.isButton()) return;
		if (!interaction.guild) return;

		const { client } = interaction;
		const guildId = interaction.guild.id;
		const translations = new Translate(client, guildId);

		const command = client.buttonCommands.get(interaction.customId) || client.buttonCommands.get(getPrefix(interaction.customId));

		if (!command) {
			return await require('../messages/defaultButtonError').execute(interaction);
		}

		const server = await Server.findOne({ guild_id: guildId });

		if (command.init && !server) {
			return interaction.reply({
				content: translations.translate('SERVER_IS_NOT_INIT'),
				flags: 64,
			});
		}

		try {
			return await command.execute(interaction);
		}
		catch (err) {
			console.error(err);
			try {
				if (interaction.replied || interaction.deferred) {
					await interaction.followUp({
						content: translations.translate('COMMAND_EXECUTE_ERROR'),
						flags: 64,
					});
				}
				else {
					await interaction.reply({
						content: translations.translate('COMMAND_EXECUTE_ERROR'),
						flags: 64,
					});
				}
			}
			catch (replyErr) {
				console.error('Failed to send error message to interaction:', replyErr);
			}
		}
	},
};
