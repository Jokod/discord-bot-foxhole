const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const { Server } = require('../../../data/models.js');
const Translate = require('../../../utils/translations.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('setup')
		.setDescription('Command to init the server configuration.')
		.setDescriptionLocalizations({
			fr: 'Commande pour initialiser la configuration du serveur.',
		})
		.addStringOption(option =>
			option
				.setName('lang')
				.setNameLocalizations({
					fr: 'langue',
				})
				.setDescription('The language of the server.')
				.setDescriptionLocalizations({
					fr: 'La langue du serveur.',
				})
				.setRequired(true)
				.addChoices(
					{ name: 'English', value: 'en' },
					{ name: 'Français', value: 'fr' },
				),
		)
		.addStringOption(option =>
			option
				.setName('camp')
				.setNameLocalizations({
					fr: 'camp',
				})
				.setDescription('The camp of the server.')
				.setDescriptionLocalizations({
					fr: 'Le camp du serveur.',
				})
				.setRequired(true)
				.addChoices(
					{ name: 'Warden', value: 'warden' },
					{ name: 'Colonial', value: 'colonial' },
				),
		),
	async execute(interaction) {
		const guild = interaction.guild;
		const server = await Server.findOne({ guild_id: interaction.guild.id });
		const translations = new Translate(interaction.client, guild.id);

		if (server) {
			await interaction.reply({
				content: translations.translate('SERVER_IS_ALREADY_INIT'),
				ephemeral: true,
			});
			return;
		}

		const lang = interaction.options.getString('lang');
		const camp = interaction.options.getString('camp');

		const newServer = new Server({
			guild_id: guild.id,
			lang: lang,
			camp,
		});

		await newServer.save();

		interaction.client.traductions.set(guild.id, lang);

		const embed = new EmbedBuilder()
			.setTitle(translations.translate('SERVER_TITLE_CONFIGURATION'))
			.addFields(
				{ name: translations.translate('SERVER_FIELD_GUILD_NAME'), value: guild.name, inline: false },
				{ name: translations.translate('SERVER_FIELD_GUILD_ID'), value: guild.id, inline: false },
				{ name: translations.translate('SERVER_FIELD_GUILD_LANG'), value: newServer.lang, inline: false },
				{ name: translations.translate('SERVER_FIELD_GUILD_CAMP'), value: newServer.camp, inline: false },
			);

		return interaction.reply({
			content: translations.translate('SERVER_IS_INIT'),
			embeds: [embed],
			ephemeral: true,
		});
	},
};
