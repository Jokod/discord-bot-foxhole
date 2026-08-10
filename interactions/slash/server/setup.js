const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const { Server } = require('../../../data/models.js');
const Translate = require('../../../utils/translations.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('setup')
		.setNameLocalizations({
			fr: 'configurer',
			ru: 'настройка',
			'zh-CN': '初始化',
		})
		.setDescription('Command to init the server configuration.')
		.setDescriptionLocalizations({
			fr: 'Commande pour initialiser la configuration du serveur.',
			ru: 'Команда для инициализации конфигурации сервера.',
			'zh-CN': '初始化服务器配置的命令。',
		})
		.addStringOption(option =>
			option
				.setName('lang')
				.setNameLocalizations({
					fr: 'langue',
					ru: 'язык',
					'zh-CN': '语言',
				})
				.setDescription('The language of the server.')
				.setDescriptionLocalizations({
					fr: 'La langue du serveur.',
					ru: 'Язык сервера.',
					'zh-CN': '服务器的语言。',
				})
				.setRequired(true)
				.addChoices(
					{ name: 'English', value: 'en' },
					{ name: 'Français', value: 'fr' },
					{ name: 'Russian', value: 'ru' },
					{ name: 'Chinese', value: 'zh-CN' },
				),
		)
		.addStringOption(option =>
			option
				.setName('camp')
				.setNameLocalizations({
					fr: 'camp',
					ru: 'лагерь',
					'zh-CN': '营地',
				})
				.setDescription('The camp of the server.')
				.setDescriptionLocalizations({
					fr: 'Le camp du serveur.',
					ru: 'Лагерь сервера.',
					'zh-CN': '服务器的营地。',
				})
				.setRequired(true)
				.addChoices(
					{ name: 'Warden', value: 'warden' },
					{ name: 'Colonial', value: 'colonial' },
				),
		)
		.addBooleanOption(option =>
			option
				.setName('logs')
				.setNameLocalizations({
					fr: 'logs',
					ru: 'логи',
					'zh-CN': '日志',
				})
				.setDescription('Create locked Logs threads for order boards (default: false).')
				.setDescriptionLocalizations({
					fr: 'Créer des threads Logs verrouillés pour les tableaux de commandes (défaut : faux).',
					ru: 'Создавать заблокированные треды логов для досок заказов (по умолчанию: нет).',
					'zh-CN': '为订单面板创建只读日志讨论串（默认：否）。',
				})
				.setRequired(false),
		),
	async execute(interaction) {
		const guild = interaction.guild;
		const server = await Server.findOne({ guild_id: interaction.guild.id });
		const translations = new Translate(interaction.client, guild.id);

		if (server) {
			await interaction.reply({
				content: translations.translate('SERVER_IS_ALREADY_INIT'),
				flags: 64,
			});
			return;
		}

		const lang = interaction.options.getString('lang');
		const camp = interaction.options.getString('camp');
		const logs = interaction.options.getBoolean('logs') ?? false;

		const newServer = new Server({
			guild_id: guild.id,
			lang: lang,
			camp,
			logs,
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
				{
					name: translations.translate('SERVER_FIELD_GUILD_LOGS'),
					value: translations.translate(logs ? 'SERVER_LOGS_ENABLED' : 'SERVER_LOGS_DISABLED'),
					inline: false,
				},
			);

		return interaction.reply({
			content: translations.translate('SERVER_IS_INIT'),
			embeds: [embed],
			flags: 64,
		});
	},
};
