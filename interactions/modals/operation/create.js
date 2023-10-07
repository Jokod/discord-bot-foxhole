const { ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
const { Operation } = require('../../../data/models.js');

module.exports = {
	id: 'modal_create_operation',

	async execute(interaction) {
		const operationId = interaction.customId.split('-')[1];

		const dateField = interaction.fields.getTextInputValue('date');
		const timeField = interaction.fields.getTextInputValue('time');
		const durationField = interaction.fields.getTextInputValue('duration');
		const descriptionField = interaction.fields.getTextInputValue('description');

		const startButton = new ButtonBuilder()
			.setCustomId(`button_create_operation_start-${operationId}`)
			.setLabel('Start')
			.setStyle(ButtonStyle.Success);

		const cancelButton = new ButtonBuilder()
			.setCustomId(`button_create_operation_cancel-${operationId}`)
			.setLabel('Cancel')
			.setStyle(ButtonStyle.Danger);

		const logisticsButton = new ButtonBuilder()
			.setCustomId(`button_create_operation_logistics-${operationId}`)
			.setLabel('Logistics')
			.setStyle(ButtonStyle.Primary)
			.setEmoji('📦');

		const actionRow = new ActionRowBuilder().addComponents(startButton, cancelButton, logisticsButton);

		const content = `**Date:** ${dateField}\n**Heure:** ${timeField}\n**Durée:** ${durationField} min\n**Description:** ${descriptionField}`;

		try {
			const operation = await Operation.findOneAndUpdate(
				{ operation_id: `${operationId}` },
				{
					date: dateField,
					time: timeField,
					duration: durationField,
					description: descriptionField,
				}, { new: true },
			);

			if (!operation) {
				return await interaction.reply({
					content: 'The operation does not exist.',
					ephemeral: true,
				});
			}

			const message = await interaction.reply({
				content: `Operation ${operation.title} created.\n${content}`,
				components: [actionRow],
			});

			await require('../../../messages/react.js').execute(message);
		}
		catch (error) {
			console.error(error);
		}
	},
};
