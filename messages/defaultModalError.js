const Translate = require('../utils/translations.js');
const { v2Text } = require('../utils/componentsV2.js');

module.exports = {
	async execute(interaction) {
		const translations = new Translate(interaction.client, interaction.guild.id);

		await interaction.reply(v2Text(translations.translate('INTERACTION_ERROR'), { ephemeral: true }));
		return;
	},
};
