const { ModalBuilder, ActionRowBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');

module.exports = {
	id: 'button_logistics_remove',

	async execute(interaction) {
		const operationId = interaction.customId.split('-')[1];
		const threadId = interaction.customId.split('-')[2];

		const modal = new ModalBuilder()
			.setCustomId(`modal_logistics_remove-${operationId}-${threadId}`)
			.setTitle('Enter the material ID')

		const materialIdField = new TextInputBuilder()
			.setCustomId('material_id')
			.setLabel('Enter the material ID')
			.setStyle(TextInputStyle.Short)
			.setMinLength(1)
			.setRequired(true);

		const actionRow = new ActionRowBuilder().addComponents(materialIdField);

		modal.addComponents(actionRow);

		await interaction.showModal(modal);
	},
};
