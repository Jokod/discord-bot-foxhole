const { ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
const { Operation } = require('../../../data/models.js');
const React = require('../../../messages/react.js');
const Translate = require('../../../utils/translations.js');

module.exports = {
	id: 'modal_create_operation',

	async execute(interaction) {
		const operationId = interaction.customId.split('-')[1];
		const translations = new Translate(interaction.client, interaction.guild.id);

		const title = interaction.client.sessions[interaction.user.id].title;
		const dateField = interaction.fields.getTextInputValue('date');
		const timeField = interaction.fields.getTextInputValue('time');
		const durationField = interaction.fields.getTextInputValue('duration');
		const descriptionField = interaction.fields.getTextInputValue('description');

		const dateRegex = new RegExp('^(0[1-9]|[12][0-9]|3[01])/(0[1-9]|1[012])/[0-9]{4}$');
		const timeRegex = new RegExp('^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$');

		if (!dateRegex.test(dateField)) {
			return await interaction.reply({
				content: translations.translate('OPERATION_DATE_FORMAT_ERROR'),
				ephemeral: true,
			});
		}

		if (!timeRegex.test(timeField)) {
			return await interaction.reply({
				content: translations.translate('OPERATION_TIME_FORMAT_ERROR'),
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
			.setLabel(translations.translate('START'))
			.setStyle(ButtonStyle.Success);

		const cancelButton = new ButtonBuilder()
			.setCustomId(`button_create_operation_cancel-${operationId}`)
			.setLabel(translations.translate('CANCEL'))
			.setStyle(ButtonStyle.Danger);

		const logisticsButton = new ButtonBuilder()
			.setCustomId(`button_create_operation_logistics-${operationId}`)
			.setLabel(translations.translate('LOGISTICS'))
			.setStyle(ButtonStyle.Primary)
			.setEmoji('📦');

		const actionRow = new ActionRowBuilder().addComponents(startButton, cancelButton, logisticsButton);

		const content = `**${translations.translate('ID')}:** ${operationId}\n**${translations.translate('OPERATION_CREATOR')}:** <@${interaction.user.id}>\n**${translations.translate('DATE')}:** <t:${timestamp}:d>\n**${translations.translate('HOURS')}:** <t:${timestamp}:t>\n**${translations.translate('DURATION')}:** ${durationField} min\n**${translations.translate('DESCRIPTION')}:** ${descriptionField}`;

		try {
			await Operation.create({
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
				content: `${translations.translate('OPERATION_CREATE_SUCCESS', { title: title })}.\n${content}`,
				components: [actionRow],
				fetchReply: true,
			});

			delete interaction.client.sessions[interaction.user.id];

			await React.execute(message);
		}
		catch (error) {
			console.error(error);
		}
	},
};
