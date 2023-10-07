const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const { Server } = require('../../../data/models.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('server')
		.setNameLocalizations({
			fr: 'serveur',
		})
		.setDescription('Commands to manage the server configuration.')
		.setDescriptionLocalizations({
			fr: 'Commandes pour gérer la configuration du serveur.',
		})
		.addSubcommand((subcommand) =>
			subcommand
				.setName('infos')
				.setDescription('Displays the server configuration.')
				.setDescriptionLocalizations({
					fr: 'Affiche la configuration du serveur.',
				}),
		)
		.addSubcommand((subcommand) =>
			subcommand
				.setName('lang')
				.setDescription('Changes the bot language.')
				.setDescriptionLocalizations({
					fr: 'Change la langue du bot.',
				})
				.addStringOption((option) =>
					option
						.setName('lang')
						.setDescription('The language to use.')
						.setDescriptionLocalizations({
							fr: 'La langue à utiliser.',
						})
						.setRequired(true)
						.addChoices(
							{ name: 'English', value: 'en' },
							{ name: 'Français', value: 'fr' },
						),
				),
		)
		.addSubcommand((subcommand) =>
			subcommand
				.setName('camp')
				.setDescription('Changes the server camp.')
				.setDescriptionLocalizations({
					fr: 'Change le camp du serveur.',
				})
				.addStringOption((option) =>
					option
						.setName('camp')
						.setDescription('The camp to use.')
						.setDescriptionLocalizations({
							fr: 'Le camp à utiliser.',
						})
						.setRequired(true)
						.addChoices(
							{ name: 'Warden', value: 'warden' },
							{ name: 'Colonial', value: 'colonial' },
						),
				),
		),
	async execute(interaction) {
		const guild = interaction.member.guild;
		const subcommand = interaction.options.getSubcommand();
		const server = await Server.findOne({ guild_id: guild.id });

		if (!server) {
			return interaction.reply({
				content: 'The server is not initialized, use the `/setup` command.',
				ephemeral: true,
			});
		}

		const embed = new EmbedBuilder()
			.setTitle('Server configuration')
			.addFields(
				{ name: 'Server', value: guild.name, inline: false },
				{ name: 'Server ID', value: guild.id, inline: false },
				{ name: 'Language', value: server.lang, inline: false },
				{ name: 'Camp', value: server.camp, inline: false },
			);

		switch (subcommand) {
		case 'infos':
			return interaction.reply({
				embeds: [embed],
				ephemeral: true,
			});
		case 'lang':
			await Server.findOneAndUpdate(
				{ guild_id: guild.id },
				{ lang: interaction.options.getString('lang') },
				{ new: true },
			);

			return interaction.reply({
				content: `The language of the server has been changed to **${(interaction.options.getString('lang')).toUpperCase()}**.`,
				ephemeral: true,
			});
		case 'camp':
			await Server.findOneAndUpdate(
				{ guild_id: guild.id },
				{ camp: interaction.options.getString('camp') },
				{ new: true },
			);

			return interaction.reply({
				content: `The camp of the server has been changed to **${(interaction.options.getString('camp')).toUpperCase()}**.`,
				ephemeral: true,
			});
		default:
			return interaction.reply({
				content: 'Sous-commande inconnue.',
				ephemeral: true,
			});
		}
	},
};
