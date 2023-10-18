const { ModalBuilder, ActionRowBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const Translate = require('../../../utils/translations.js');

module.exports = {
	id: 'button_logistics_remove',

	async execute(interaction) {
		const { client, guild } = interaction;
		const translations = new Translate(client, guild.id);

		const modal = new ModalBuilder()
			.setCustomId('modal_logistics_remove')
			.setTitle(translations.translate('MATERIAL_ENTER_ID'));

		const materialIdField = new TextInputBuilder()
			.setCustomId('material_id')
			.setLabel(translations.translate('MATERIAL_ENTER_ID'))
			.setStyle(TextInputStyle.Short)
			.setMinLength(1)
			.setRequired(true);

		const actionRow = new ActionRowBuilder().addComponents(materialIdField);

		modal.addComponents(actionRow);

		await interaction.showModal(modal);
	},
};
