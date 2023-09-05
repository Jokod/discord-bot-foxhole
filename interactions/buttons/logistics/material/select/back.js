const { ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
const { Operation } = require('../../../../../data/models.js');

module.exports = {
	id: 'logistics_select_material_back',

	async execute(interaction) {
		const operationId = interaction.customId.split('-')[1];
		const threadId = interaction.customId.split('-')[2];
		const materialId = interaction.customId.split('-')[3];
		const operation = await Operation.findOne({ operation_id: `${operationId}` });

		const materialButton = new ButtonBuilder()
			.setCustomId(`button_logistics_add_material-${operationId}-${threadId}-${materialId}`)
			.setLabel('Matériel')
			.setStyle(ButtonStyle.Primary);

		const quantityAskButton = new ButtonBuilder()
			.setCustomId(`button_logistics_add_quantity_ask-${operationId}-${threadId}-${materialId}`)
			.setLabel('Quantité')
			.setStyle(ButtonStyle.Secondary);

		const confirmButton = new ButtonBuilder()
			.setCustomId(`button_logistics_add_confirm-${operationId}-${threadId}-${materialId}`)
			.setLabel('Confirmer')
			.setStyle(ButtonStyle.Success);

		const deleteButton = new ButtonBuilder()
			.setCustomId(`button_logistics_material_delete-${materialId}`)
			.setLabel('Supprimer')
			.setStyle(ButtonStyle.Danger);

		const ActionRow = new ActionRowBuilder().addComponents(materialButton, quantityAskButton, confirmButton, deleteButton);

		await interaction.update({
			content: `**ID:** ${materialId}\nAjout d'un matériel à l'opération **${operation.title}**`,
			components: [ActionRow],
		});
	},
};
