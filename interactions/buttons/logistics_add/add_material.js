const { ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
const { Operation } = require('../../../data/models.js');

module.exports = {
	id: 'button_logistics_add_material',

	async execute(interaction) {
		const operationId = interaction.customId.split('-')[1];
		const threadId = interaction.customId.split('-')[2];
		const materialId = interaction.customId.split('-')[3];

		const operation = await Operation.findOne({ where: { operation_id: operationId } });

		const buttonSmallArms = new ButtonBuilder()
			.setCustomId(`logistics_select_material_small_arms-${operationId}-${threadId}-${materialId}`)
			.setLabel('Armes légères')
			.setStyle(ButtonStyle.Primary);

		const buttonHeavyArms = new ButtonBuilder()
			.setCustomId(`logistics_select_material_heavy_arms-${operationId}-${threadId}-${materialId}`)
			.setLabel('Armes lourdes')
			.setStyle(ButtonStyle.Primary);

		const buttonUtilities = new ButtonBuilder()
			.setCustomId(`logistics_select_material_utilities-${operationId}-${threadId}-${materialId}`)
			.setLabel('Utilitaires')
			.setStyle(ButtonStyle.Primary);

		const buttonShipables = new ButtonBuilder()
			.setCustomId(`logistics_select_material_shipables-${operationId}-${threadId}-${materialId}`)
			.setLabel('Objets transportables')
			.setStyle(ButtonStyle.Primary);

		const buttonVehicles = new ButtonBuilder()
			.setCustomId(`logistics_select_material_vehicles-${operationId}-${threadId}-${materialId}`)
			.setLabel('Véhicules')
			.setStyle(ButtonStyle.Primary);

		const buttonUniforms = new ButtonBuilder()
			.setCustomId(`logistics_select_material_uniforms-${operationId}-${threadId}-${materialId}`)
			.setLabel('Uniformes')
			.setStyle(ButtonStyle.Primary);

		const buttonBack = new ButtonBuilder()
			.setCustomId(`logistics_select_material_back-${operationId}-${threadId}-${materialId}`)
			.setLabel('Retour')
			.setStyle(ButtonStyle.Secondary);

		const firstArrowRow = new ActionRowBuilder().addComponents(buttonSmallArms, buttonUtilities, buttonHeavyArms);
		const secondArrowRow = new ActionRowBuilder().addComponents(buttonShipables, buttonVehicles, buttonUniforms);
		const thirdArrowRow = new ActionRowBuilder().addComponents(buttonBack);

		await interaction.update({
			content: `**ID:** ${materialId}\nSélectionnez le type de matériel à ajouter à l'opération **${operation.get('title')}**`,
			components: [firstArrowRow, secondArrowRow, thirdArrowRow],
		});
	},
};
