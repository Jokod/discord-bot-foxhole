const { Events } = require("discord.js");

module.exports = {
	name: Events.InteractionCreate,

	/**
	 * @description Executes when an interaction is created and handle it.
	
	 * @param {import('discord.js').SelectMenuInteraction & { client: import('../typings').Client }} interaction The interaction which was created
	 */

	async execute(interaction) {
		// Deconstructed client from interaction object.
		const { client } = interaction;

		// Checks if the interaction is a select menu interaction (to prevent weird bugs)

		if (!interaction.isStringSelectMenu()) return;

		const command = client.selectCommands.get(interaction.customId) || client.selectCommands.get(interaction.customId.split('-')[0]);

		// If the interaction is not a command in cache, return error message.
		// You can modify the error message at ./messages/defaultSelectError.js file!

		if (!command) {
			return await require("../messages/defaultSelectError").execute(interaction);
		}

		// A try to execute the interaction.

		try {
			await command.execute(interaction);
		} catch (err) {
			console.error(err);
			await interaction.reply({
				content: "Une erreur s'est produite lors de l'exécution de cette commande !",
				ephemeral: true,
			});
		}
	},
};
