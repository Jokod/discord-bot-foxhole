module.exports = {
	/**
	 * @description Executes when the button interaction could not be fetched.
	
	 * @param {import('discord.js').ButtonInteraction} interaction The Interaction Object of the command.
	 */

	async execute(interaction) {
		await interaction.reply({
			content: "Aucune intéraction n'a été trouvée pour cette action.",
			ephemeral: true,
		});
		return;
	},
};
