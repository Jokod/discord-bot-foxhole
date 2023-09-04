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
							{ name: 'Français', value: 'fr' },
							{ name: 'English', value: 'en' },
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
				content: 'Le serveur n\'est pas configuré, veuillez utiliser la commande `/setup`.',
				ephemeral: true,
			});
		}

		const embed = new EmbedBuilder()
			.setTitle('Configuration du serveur')
			.addFields(
				{ name: 'Serveur', value: guild.name, inline: false },
				{ name: 'ID du serveur', value: guild.id, inline: false },
				{ name: 'Langue', value: server.langue, inline: false },
				{ name: 'Camp', value: server.camp, inline: false },
			);

		switch (subcommand) {
		case 'infos':
			return interaction.reply({
				embeds: [embed],
				ephemeral: true,
			});
		case 'langue':
			await Server.findOneAndUpdate(
				{ guild_id: guild.id },
				{ langue: interaction.options.getString('langue') },
				{ new: true },
			);

			return interaction.reply({
				content: `La langue du serveur a été changée en ${server.langue}.`,
				ephemeral: true,
			});
		case 'camp':
			await Server.findOneAndUpdate(
				{ guild_id: guild.id },
				{ camp: interaction.options.getString('camp') },
				{ new: true },
			);

			return interaction.reply({
				content: `Le camp du serveur a été changé en ${server.camp}.`,
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
