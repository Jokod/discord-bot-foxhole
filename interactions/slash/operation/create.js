const { SlashCommandBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');
const Translate = require('../../../utils/translations.js');

module.exports = {
	init: true,
	data: new SlashCommandBuilder()
		.setName('create_operation')
		.setNameLocalizations({
			fr: 'créer_opération',
		})
		.setDescription('Create a new operation')
		.setDescriptionLocalizations({
			fr: 'Créer une nouvelle opération',
		})
		.addStringOption((option) =>
			option
				.setName('title')
				.setNameLocalizations({
					fr: 'titre',
				})
				.setDescription('Title of the operation')
				.setDescriptionLocalizations({
					fr: 'Titre de l\'opération',
				})
				.setRequired(true),
		)
		.setDMPermission(false),

	async execute(interaction) {
		const title = interaction.options.getString('title').toUpperCase();
		const translations = new Translate(interaction.client, interaction.guild.id);

		interaction.client.sessions[interaction.user.id] = { title: title };

		const modal = new ModalBuilder()
			.setCustomId(`modal_create_operation-${interaction.id}`)
			.setTitle(translations.translate('OPERATION_CREATE_TITLE', { title: title }));

		const dateField = new TextInputBuilder()
			.setCustomId('date')
			.setLabel(translations.translate('OPERATION_CREATE_LABEL_DATE'))
			.setPlaceholder('dd/mm/yyyy')
			.setStyle(TextInputStyle.Short)
			.setMinLength(10)
			.setMaxLength(10)
			.setRequired(true);

		const timeField = new TextInputBuilder()
			.setCustomId('time')
			.setLabel(translations.translate('OPERATION_CREATE_LABEL_TIME'))
			.setPlaceholder('hh:mm')
			.setStyle(TextInputStyle.Short)
			.setMinLength(5)
			.setMaxLength(5)
			.setRequired(true);

		const durationField = new TextInputBuilder()
			.setCustomId('duration')
			.setLabel(translations.translate('OPERATION_CREATE_LABEL_DURATION'))
			.setValue('60')
			.setStyle(TextInputStyle.Short)
			.setMinLength(1)
			.setMaxLength(3)
			.setRequired(true);

		const descriptionField = new TextInputBuilder()
			.setCustomId('description')
			.setLabel(translations.translate('OPERATION_CREATE_LABEL_DESCRIPTION'))
			.setStyle(TextInputStyle.Paragraph)
			.setMinLength(1)
			.setMaxLength(1000)
			.setRequired(true);

		const firstActionRow = new ActionRowBuilder().addComponents(dateField);
		const secondActionRow = new ActionRowBuilder().addComponents(timeField);
		const thirdActionRow = new ActionRowBuilder().addComponents(durationField);
		const fourthActionRow = new ActionRowBuilder().addComponents(descriptionField);

		modal.addComponents(firstActionRow, secondActionRow, thirdActionRow, fourthActionRow);

		await interaction.showModal(modal);
	},
};
