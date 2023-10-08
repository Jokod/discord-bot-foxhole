const { SlashCommandBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');

module.exports = {
	init: true,
	data: new SlashCommandBuilder()
		.setName('create_operation')
		.setDescription('Create a new operation')
		.setDescriptionLocalizations({
			fr: 'Créer une nouvelle opération',
		})
		.addStringOption((option) =>
			option
				.setName('title')
				.setDescription('Title of the operation')
				.setDescriptionLocalizations({
					fr: 'Titre de l\'opération',
				})
				.setRequired(true),
		)
		.setDMPermission(false),

	async execute(interaction) {
		const title = interaction.options.getString('title').toUpperCase();

		interaction.client.sessions[interaction.user.id] = { title: title };

		const modal = new ModalBuilder()
			.setCustomId(`modal_create_operation-${interaction.id}`)
			.setTitle(`Operation ${title}`);

		const dateField = new TextInputBuilder()
			.setCustomId('date')
			.setLabel('Date of the operation (dd/mm/yyyy)')
			.setPlaceholder('dd/mm/yyyy')
			.setStyle(TextInputStyle.Short)
			.setMinLength(10)
			.setMaxLength(10)
			.setRequired(true);

		const timeField = new TextInputBuilder()
			.setCustomId('time')
			.setLabel('Hour of the operation (hh:mm)')
			.setPlaceholder('hh:mm')
			.setStyle(TextInputStyle.Short)
			.setMinLength(5)
			.setMaxLength(5)
			.setRequired(true);

		const durationField = new TextInputBuilder()
			.setCustomId('duration')
			.setLabel('Duration of the operation (in minutes)')
			.setValue('60')
			.setStyle(TextInputStyle.Short)
			.setMinLength(1)
			.setMaxLength(3)
			.setRequired(true);

		const descriptionField = new TextInputBuilder()
			.setCustomId('description')
			.setLabel('Description of the operation')
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
