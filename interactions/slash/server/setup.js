const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const { Server } = require('../../../data/models.js');

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

		if (server) {
			await interaction.reply({
				content: 'The server is already initialized.',
				ephemeral: true,
			});
			return;
		}

		const lang = interaction.options.getString('lang');
		const camp = interaction.options.getString('camp');

		const newServer = new Server({
			guild_id: interaction.guild.id,
			lang: lang,
			camp,
		});

		await newServer.save();

		const embed = new EmbedBuilder()
			.setTitle('Server configuration')
			.addFields(
				{ name: 'Server', value: guild.name, inline: false },
				{ name: 'Server ID', value: guild.id, inline: false },
				{ name: 'Language', value: newServer.lang, inline: false },
				{ name: 'Camp', value: newServer.camp, inline: false },
			);

		return interaction.reply({
			content: 'The server has been initialized.',
			embeds: [embed],
			ephemeral: true,
		});
	},
};
