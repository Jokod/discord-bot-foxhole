const { ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
const Translate = require('../translations.js');

class ManageMaterial {
	constructor(interaction) {
		this.interaction = interaction;
		this.translations = new Translate(this.interaction.client, this.interaction.guild.id);
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
			this.translations.translate('MATERIAL'),
			ButtonStyle.Primary,
		);

		const quantityAskButton = this.createButton(
			`button_logistics_add_quantity_ask-${operationId}-${threadId}-${materialId}`,
			this.translations.translate('QUANTITY'),
			ButtonStyle.Secondary,
		);

		const confirmButton = this.createButton(
			`button_logistics_add_confirm-${operationId}-${threadId}-${materialId}`,
			this.translations.translate('CONFIRM'),
			ButtonStyle.Success,
		);

		const deleteButton = this.createButton(
			`button_logistics_material_delete-${materialId}`,
			this.translations.translate('DELETE'),
			ButtonStyle.Danger,
		);

		return new ActionRowBuilder().addComponents(materialButton, quantityAskButton, confirmButton, deleteButton);
	}
}

module.exports = ManageMaterial;
