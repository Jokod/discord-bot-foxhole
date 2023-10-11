const Translate = require('../utils/translations.js');

module.exports = {
	async execute(interaction) {
		const translations = new Translate(interaction.client, interaction.guild.id);

		await interaction.reply({
			content: translations.translate('INTERACTION_ERROR'),
			ephemeral: true,
		});
		return;
	},
};
