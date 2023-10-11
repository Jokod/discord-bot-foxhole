const { ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
const Translate = require('../../../../../utils/translations.js');

module.exports = {
	id: 'logistics_select_material_back',

	async execute(interaction) {
		const operationId = interaction.customId.split('-')[1];
		const threadId = interaction.customId.split('-')[2];
		const materialId = interaction.customId.split('-')[3];
		const translations = new Translate(interaction.client, interaction.guild.id);

		const materialButton = new ButtonBuilder()
			.setCustomId(`button_logistics_add_material-${operationId}-${threadId}-${materialId}`)
			.setLabel(translations.translate('MATERIAL'))
			.setStyle(ButtonStyle.Primary);

		const quantityAskButton = new ButtonBuilder()
			.setCustomId(`button_logistics_add_quantity_ask-${operationId}-${threadId}-${materialId}`)
			.setLabel(translations.translate('QUANTITY'))
			.setStyle(ButtonStyle.Secondary);

		const confirmButton = new ButtonBuilder()
			.setCustomId(`button_logistics_add_confirm-${operationId}-${threadId}-${materialId}`)
			.setLabel(translations.translate('CONFIRM'))
			.setStyle(ButtonStyle.Success);

		const deleteButton = new ButtonBuilder()
			.setCustomId(`button_logistics_material_delete-${materialId}`)
			.setLabel(translations.translate('DELETE'))
			.setStyle(ButtonStyle.Danger);

		const ActionRow = new ActionRowBuilder().addComponents(materialButton, quantityAskButton, confirmButton, deleteButton);

		await interaction.update({
			content: `**${translations.translate('ID')}:** ${materialId}\n${translations.translate('MATERIAL_ADD')}`,
			components: [ActionRow],
		});
	},
};
