const { ModalBuilder, ActionRowBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const { Material } = require('../../../../../data/models.js');

module.exports = {
	id: 'button_logistics_add_quantity_ask',

	async execute(interaction) {
		const operationId = interaction.customId.split('-')[1];
		const threadId = interaction.customId.split('-')[2];
		const materialId = interaction.customId.split('-')[3];

		const material = await Material.findOne({ material_id: `${materialId}` });

		const modal = new ModalBuilder()
			.setCustomId(`modal_logistics_add_quantity_ask-${operationId}-${threadId}-${materialId}`)
			.setTitle('Séléctionnez une quantité');

		const quantityAskField = new TextInputBuilder()
			.setCustomId('quantity_ask')
			.setLabel('Saissisez une quantité')
			.setStyle(TextInputStyle.Short)
			.setValue(`${material.quantityAsk}`)
			.setMinLength(1)
			.setMaxLength(5)
			.setRequired(true);

		const actionRow = new ActionRowBuilder().addComponents(quantityAskField);

		modal.addComponents(actionRow);

		await interaction.showModal(modal);
	},
};
