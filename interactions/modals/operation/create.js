const { ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
const { Operation } = require('../../../data/models.js');

module.exports = {
	id: 'modal_create_operation',

	async execute(interaction) {
		const operationId = interaction.customId.split('-')[1];

		const title = interaction.client.sessions[interaction.user.id].title;
		const dateField = interaction.fields.getTextInputValue('date');
		const timeField = interaction.fields.getTextInputValue('time');
		const durationField = interaction.fields.getTextInputValue('duration');
		const descriptionField = interaction.fields.getTextInputValue('description');

		const dateRegex = new RegExp('^(0[1-9]|[12][0-9]|3[01])/(0[1-9]|1[012])/[0-9]{4}$');
		const timeRegex = new RegExp('^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$');

		if (!dateRegex.test(dateField)) {
			return await interaction.reply({
				content: 'The date format is incorrect.',
				ephemeral: true,
			});
		}

		if (!timeRegex.test(timeField)) {
			return await interaction.reply({
				content: 'The time format is incorrect.',
				ephemeral: true,
			});
		}

		const dateParts = dateField.split('/');
		const timeParts = timeField.split(':');

		const year = dateParts[2];
		const month = dateParts[1];
		const day = dateParts[0];
		const hours = timeParts[0];
		const minutes = timeParts[1];

		const timestamp = new Date(`${year}-${month}-${day}T${hours}:${minutes}:00`).getTime() / 1000;

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

		const content = `**ID:** ${operationId}\n**Date:** <t:${timestamp}:d>\n**Heure:** <t:${timestamp}:t>\n**Durée:** ${durationField} min\n**Description:** ${descriptionField}`;

		try {
			const operation = await Operation.create({
				title: `${title}`,
				guild_id: `${interaction.guild.id}`,
				operation_id: `${operationId}`,
				owner_id: `${interaction.user.id}`,
				date: `<t:${timestamp}:d>`,
				time: `<t:${timestamp}:t>`,
				duration: durationField,
				description: descriptionField,
				status: 'pending',
			});

			const message = await interaction.reply({
				content: `Operation ${operation.title} created.\n${content}`,
				components: [actionRow],
			});

			delete interaction.client.sessions[interaction.user.id];

			await require('../../../messages/react.js').execute(message);
		}
		catch (error) {
			console.error(error);
		}
	},
};
