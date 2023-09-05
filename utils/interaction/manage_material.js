const { ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');

class ManageMaterial {
	constructor(interaction) {
		this.interaction = interaction;
	}

	createButton(customId, label, style) {
		return new ButtonBuilder()
			.setCustomId(customId)
			.setLabel(label)
			.setStyle(style);
	}

	actionRow() {
		const operationId = this.interaction.customId.split('-')[1];
		const threadId = this.interaction.customId.split('-')[2];
		const materialId = this.interaction.customId.split('-')[3];

		const materialButton = this.createButton(
			`button_logistics_add_material-${operationId}-${threadId}-${materialId}`,
			'Matériel',
			ButtonStyle.Primary,
		);

		const quantityAskButton = this.createButton(
			`button_logistics_add_quantity_ask-${operationId}-${threadId}-${materialId}`,
			'Quantité',
			ButtonStyle.Secondary,
		);

		const confirmButton = this.createButton(
			`button_logistics_add_confirm-${operationId}-${threadId}-${materialId}`,
			'Confirmer',
			ButtonStyle.Success,
		);

		const deleteButton = this.createButton(
			`button_logistics_material_delete-${materialId}`,
			'Supprimer',
			ButtonStyle.Danger,
		);

		return new ActionRowBuilder().addComponents(materialButton, quantityAskButton, confirmButton, deleteButton);
	}
}

module.exports = ManageMaterial;
