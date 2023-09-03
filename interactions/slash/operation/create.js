const { SlashCommandBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');
const { Operation } = require('../../../data/models.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('create_operation')
		.setDescription('Créer une nouvelle opération')
		.addStringOption((option) =>
			option
				.setName('titre')
				.setDescription('Titre de l\'opération')
				.setRequired(true),
		)
		.setDMPermission(false),

	async execute(interaction) {
		const title = interaction.options.getString('titre').toUpperCase();

		const modal = new ModalBuilder()
			.setCustomId(`modal_create_operation-${interaction.id}`)
			.setTitle(`Opération ${title}`);

		const dateField = new TextInputBuilder()
			.setCustomId('date')
			.setLabel('Date de l\'opération (dd/mm/yyyy)')
			.setPlaceholder('dd/mm/yyyy')
			.setStyle(TextInputStyle.Short)
			.setMinLength(10)
			.setMaxLength(10)
			.setRequired(true);

		const timeField = new TextInputBuilder()
			.setCustomId('time')
			.setLabel('Heure de l\'opération (hh:mm)')
			.setPlaceholder('hh:mm')
			.setStyle(TextInputStyle.Short)
			.setMinLength(5)
			.setMaxLength(5)
			.setRequired(true);

		const durationField = new TextInputBuilder()
			.setCustomId('duration')
			.setLabel('Durée de l\'opération (en minutes)')
			.setValue('60')
			.setStyle(TextInputStyle.Short)
			.setMinLength(1)
			.setMaxLength(3)
			.setRequired(true);

		const descriptionField = new TextInputBuilder()
			.setCustomId('description')
			.setLabel('Description de l\'opération')
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

		try {

			const submitted = await interaction.awaitModalSubmit({ time: 60000, filter: i => i.user.id === interaction.user.id })
				.catch(error => {
					console.error(error);
					return null;
				});

			if (submitted) {
				const date = submitted.fields.getTextInputValue('date');
				const time = submitted.fields.getTextInputValue('time');
				const duration = submitted.fields.getTextInputValue('duration');
				const description = submitted.fields.getTextInputValue('description');

				await Operation.create({
					title: title,
					operation_id: interaction.id,
					owner_id: interaction.user.id,
					date: date,
					time: time,
					duration: duration,
					description: description,
					status: 'created',
				});
			}

		}
		catch (error) {
			console.log(error);
			if (error.name === 'SequelizeUniqueConstraintError') {
				return interaction.reply({
					content: 'Cette opération existe déjà.',
					ephemeral: true,
				});
			}

			return interaction.reply({
				content: 'Une erreur est survenue lors de l\'initialisation de l\'opération.',
				ephemeral: true,
			});
		}
	},
};
