const { ButtonBuilder, ButtonStyle, ActionRowBuilder } = require("discord.js");
const { Operation } = require("../../../data/models.js");

module.exports = {
	id: "modal_create_operation",

	async execute(interaction) {
		const operationId = interaction.customId.split('-')[1];
		const operation = await Operation.findOne({ where: { operation_id: operationId } });

		const dateField = interaction.fields.getTextInputValue('date');
		const timeField = interaction.fields.getTextInputValue('time');
		const durationField = interaction.fields.getTextInputValue('duration');
		const descriptionField = interaction.fields.getTextInputValue('description');
	
		const startButton = new ButtonBuilder()
			.setCustomId(`button_create_operation_start-${operationId}`)
			.setLabel('Lancer')
			.setStyle(ButtonStyle.Success);

		const cancelButton = new ButtonBuilder()
			.setCustomId(`button_create_operation_cancel-${operationId}`)
			.setLabel('Annuler')
			.setStyle(ButtonStyle.Danger);

		const logisticsButton = new ButtonBuilder()
			.setCustomId(`button_create_operation_logistics-${operationId}`)
			.setLabel('Logistique')
			.setStyle(ButtonStyle.Primary)
			.setEmoji('📦');

		const actionRow = new ActionRowBuilder().addComponents(startButton, cancelButton, logisticsButton);

		const content = `**Date:** ${dateField}\n**Heure:** ${timeField}\n**Durée:** ${durationField}\n**Description:** ${descriptionField}`;

		await interaction.reply({
			content: `Opération **${operation.get('title')}** en cours de préparation..\n\n${content}`,
			components: [actionRow],
		});
	},
};
