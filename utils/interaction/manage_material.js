const { ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
const Translate = require('../translations.js');

class ManageMaterial {
	constructor(client, guild) {
		this.translations = new Translate(client, guild.id);
	}

	createButton(customId, label, style) {
		return new ButtonBuilder()
			.setCustomId(customId)
			.setLabel(label)
			.setStyle(style);
	}

	actionRow() {
		const materialButton = this.createButton(
			'button_logistics_add_material',
			this.translations.translate('MATERIAL'),
			ButtonStyle.Primary,
		);

		const quantityAskButton = this.createButton(
			'button_logistics_add_quantity_ask',
			this.translations.translate('QUANTITY'),
			ButtonStyle.Secondary,
		);

		const priorityButton = this.createButton(
			'button_logistics_add_priority',
			this.translations.translate('MATERIAL_PRIORITY'),
			ButtonStyle.Secondary,
		);

		const confirmButton = this.createButton(
			'button_logistics_add_confirm',
			this.translations.translate('CONFIRM'),
			ButtonStyle.Success,
		);

		const deleteButton = this.createButton(
			'button_logistics_material_delete',
			this.translations.translate('DELETE'),
			ButtonStyle.Danger,
		);

		const row1 = new ActionRowBuilder().addComponents(materialButton, quantityAskButton, priorityButton);
		const row2 = new ActionRowBuilder().addComponents(confirmButton, deleteButton);

		return [row1, row2];
	}
}

module.exports = ManageMaterial;
