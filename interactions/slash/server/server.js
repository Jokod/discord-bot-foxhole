const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const { Server } = require('../../../data/models.js');
const Translate = require('../../../utils/translations.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('server')
		.setNameLocalizations({
			fr: 'serveur',
			ru: 'сервер',
			'zh-CN': '服务器',
		})
		.setDescription('Commands to manage the server configuration.')
		.setDescriptionLocalizations({
			fr: 'Commandes pour gérer la configuration du serveur.',
			ru: 'Команды для настройки сервера.',
			'zh-CN': '管理服务器配置的命令。',
		})
		.addSubcommand((subcommand) =>
			subcommand
				.setName('infos')
				.setNameLocalizations({
					fr: 'informations',
					ru: 'информация',
					'zh-CN': '信息',
				})
				.setDescription('Displays the server configuration.')
				.setDescriptionLocalizations({
					fr: 'Affiche la configuration du serveur.',
					ru: 'Отображает конфигурацию сервера.',
					'zh-CN': '显示服务器配置。',
				}),
		)
		.addSubcommand((subcommand) =>
			subcommand
				.setName('lang')
				.setNameLocalizations({
					fr: 'langue',
					ru: 'язык',
					'zh-CN': '语言',
				})
				.setDescription('Changes the bot language.')
				.setDescriptionLocalizations({
					fr: 'Change la langue du bot.',
					ru: 'Изменяет язык бота.',
					'zh-CN': '更改机器人语言。',
				})
				.addStringOption((option) =>
					option
						.setName('lang')
						.setNameLocalizations({
							fr: 'langue',
							ru: 'язык',
							'zh-CN': '语言',
						})
						.setDescription('The language to use.')
						.setDescriptionLocalizations({
							fr: 'La langue à utiliser.',
							ru: 'Язык для использования.',
							'zh-CN': '要使用的语言。',
						})
						.setRequired(true)
						.addChoices(
							{ name: 'English', value: 'en' },
							{ name: 'Français', value: 'fr' },
							{ name: 'Russe', value: 'ru' },
							{ name: 'Chinese', value: 'zh-CN' },
						),
				),
		)
		.addSubcommand((subcommand) =>
			subcommand
				.setName('camp')
				.setNameLocalizations({
					fr: 'camp',
					ru: 'лагерь',
					'zh-CN': '营地',
				})
				.setDescription('Changes the server camp.')
				.setDescriptionLocalizations({
					fr: 'Change le camp du serveur.',
					ru: 'Изменяет лагерь сервера.',
					'zh-CN': '更改服务器阵营。',
				})
				.addStringOption((option) =>
					option
						.setName('camp')
						.setNameLocalizations({
							fr: 'camp',
							ru: 'лагерь',
							'zh-CN': '营地',
						})
						.setDescription('The camp to use.')
						.setDescriptionLocalizations({
							fr: 'Le camp à utiliser.',
							ru: 'Лагерь для использования.',
							'zh-CN': '要使用的营地。',
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
