const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');
const { Material } = require('../../../../data/models.js');

module.exports = {
	id: 'button_logistics_material_validate',

	async execute(interaction) {
		const materialId = interaction.customId.split('-')[3];

		const material = await Material.findOne({ material_id: `${materialId}` });

		const modal = new ModalBuilder()
			.setCustomId(`modal_logistics_material_validate-${materialId}`)
			.setTitle('Confirmer le matériel');

		const locationInput = new TextInputBuilder()
			.setCustomId('localization')
			.setLabel('Lieu de stockage')
			.setPlaceholder('Lieu de stockage')
			.setStyle(TextInputStyle.Short)
			.setMaxLength(100)
			.setRequired(true);

		const quantityGiven = new TextInputBuilder()
			.setCustomId('quantity_given')
			.setLabel('Quantité donnée')
			.setPlaceholder('Quantité donnée')
			.setValue(`${material.quantityAsk}`)
			.setStyle(TextInputStyle.Short)
			.setMinLength(1)
			.setMaxLength(5)
			.setRequired(true);

		const locationRow = new ActionRowBuilder().addComponents(locationInput);
		const quantityRow = new ActionRowBuilder().addComponents(quantityGiven);

		modal.addComponents(locationRow, quantityRow);

		await interaction.showModal(modal);
	},
};
