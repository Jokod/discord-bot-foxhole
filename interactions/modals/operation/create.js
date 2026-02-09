const { ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
const { Operation } = require('../../../data/models.js');
const React = require('../../../messages/react.js');
const Translate = require('../../../utils/translations.js');

module.exports = {
	id: 'modal_create_operation',

	async execute(interaction) {
		const { client, guild, user, fields } = interaction;
		const translations = new Translate(client, guild.id);

		const title = client.sessions[user.id].title;
		const dateField = fields.getTextInputValue('date');
		const timeField = fields.getTextInputValue('time');
		const durationField = fields.getTextInputValue('duration');
		const descriptionField = fields.getTextInputValue('description');

		const dateRegex = new RegExp('^(0[1-9]|[12][0-9]|3[01])/(0[1-9]|1[012])/[0-9]{4}$');
		const timeRegex = new RegExp('^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$');
		const durationRegex = new RegExp('^[0-9]{1,3}$');
		const descriptionRegex = new RegExp('^[\\w\\s!@#]{1,1000}$');

		if (!dateRegex.test(dateField)) {
			return await interaction.reply({
				content: translations.translate('OPERATION_DATE_FORMAT_ERROR'),
				flags: 64,
			});
		}

		if (!timeRegex.test(timeField)) {
			return await interaction.reply({
				content: translations.translate('OPERATION_TIME_FORMAT_ERROR'),
				flags: 64,
			});
		}

		if (!durationRegex.test(durationField)) {
			return await interaction.reply({
				content: translations.translate('OPERATION_DURATION_FORMAT_ERROR'),
				flags: 64,
			});
		}

		if (!descriptionRegex.test(descriptionField)) {
			return await interaction.reply({
				content: translations.translate('OPERATION_DESCRIPTION_FORMAT_ERROR'),
				flags: 64,
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
			.setCustomId('button_create_operation_start')
			.setLabel(translations.translate('START'))
			.setStyle(ButtonStyle.Success);

		const cancelButton = new ButtonBuilder()
			.setCustomId('button_create_operation_cancel')
			.setLabel(translations.translate('CANCEL'))
			.setStyle(ButtonStyle.Danger);

		const logisticsButton = new ButtonBuilder()
			.setCustomId('button_create_operation_logistics')
			.setLabel(translations.translate('LOGISTICS'))
			.setStyle(ButtonStyle.Primary)
			.setEmoji('📦');

		const actionRow = new ActionRowBuilder().addComponents(startButton, cancelButton, logisticsButton);

		try {
			await Operation.create({
				title: `${title}`,
				guild_id: `${interaction.guild.id}`,
				operation_id: `${interaction.id}`,
				owner_id: `${interaction.user.id}`,
				date: `<t:${timestamp}:d>`,
				time: `<t:${timestamp}:t>`,
				duration: durationField,
				description: descriptionField,
				status: 'pending',
			});

			const content = `**${translations.translate('OPERATION_CREATOR')}:** <@${interaction.user.id}>\n**${translations.translate('DATE')}:** <t:${timestamp}:d>\n**${translations.translate('HOURS')}:** <t:${timestamp}:t>\n**${translations.translate('DURATION')}:** ${durationField} min\n**${translations.translate('DESCRIPTION')}:** ${descriptionField}`;

			const response = await interaction.reply({
				content: `${translations.translate('OPERATION_CREATE_SUCCESS', { title: title })}.\n${content}`,
				components: [actionRow],
				withResponse: true,
			});

			const message = response.resource?.message ?? await interaction.fetchReply();
			await Operation.updateOne({ guild_id: guild.id, operation_id: `${interaction.id}` }, { operation_id: `${message.id}` });

			delete interaction.client.sessions[interaction.user.id];

			await React.execute(message);
		}
		catch (error) {
			console.error(error);

			await interaction.reply({
				content: translations.translate('OPERATION_CREATE_ERROR'),
				flags: 64,
			});
		}
	},
};
