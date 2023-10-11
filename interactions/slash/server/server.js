const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const { Server } = require('../../../data/models.js');
const Translate = require('../../../utils/translations.js');

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
				.setNameLocalizations({
					fr: 'informations',
				})
				.setDescription('Displays the server configuration.')
				.setDescriptionLocalizations({
					fr: 'Affiche la configuration du serveur.',
				}),
		)
		.addSubcommand((subcommand) =>
			subcommand
				.setName('lang')
				.setNameLocalizations({
					fr: 'langue',
				})
				.setDescription('Changes the bot language.')
				.setDescriptionLocalizations({
					fr: 'Change la langue du bot.',
				})
				.addStringOption((option) =>
					option
						.setName('lang')
						.setNameLocalizations({
							fr: 'langue',
						})
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
				.setNameLocalizations({
					fr: 'camp',
				})
				.setDescription('Changes the server camp.')
				.setDescriptionLocalizations({
					fr: 'Change le camp du serveur.',
				})
				.addStringOption((option) =>
					option
						.setName('camp')
						.setNameLocalizations({
							fr: 'camp',
						})
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
		const translations = new Translate(interaction.client, guild.id);

		if (!server) {
			return interaction.reply({
				content: translations.translate('SERVER_IS_NOT_INIT'),
				ephemeral: true,
			});
		}

		const embed = new EmbedBuilder()
			.setTitle(translations.translate('SERVER_TITLE_CONFIGURATION'))
			.addFields(
				{ name: translations.translate('SERVER_FIELD_GUILD_NAME'), value: guild.name, inline: false },
				{ name: translations.translate('SERVER_FIELD_GUILD_ID'), value: guild.id, inline: false },
				{ name: translations.translate('SERVER_FIELD_GUILD_LANG'), value: server.lang, inline: false },
				{ name: translations.translate('SERVER_FIELD_GUILD_CAMP'), value: server.camp, inline: false },
			);

		const lang = interaction.options.getString('lang');
		const camp = interaction.options.getString('camp');

		switch (subcommand) {
		case 'infos':
			return interaction.reply({
				embeds: [embed],
				ephemeral: true,
			});
		case 'lang':
			await Server.findOneAndUpdate(
				{ guild_id: guild.id },
				{ lang: lang },
				{ new: true },
			);

			interaction.client.traductions.set(guild.id, lang);

			return interaction.reply({
				content: translations.translate('SERVER_SET_LANG_REPLY', { lang: lang.toUpperCase() }),
				ephemeral: true,
			});
		case 'camp':
			await Server.findOneAndUpdate(
				{ guild_id: guild.id },
				{ camp: camp },
				{ new: true },
			);

			return interaction.reply({
				content: translations.translate('SERVER_SET_CAMP_REPLY', { camp: camp.toUpperCase() }),
				ephemeral: true,
			});
		default:
			return interaction.reply({
				content: translations.translate('COMMAND_UNKNOWN'),
				ephemeral: true,
			});
		}
	},
};
