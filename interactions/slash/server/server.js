const {
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
	EmbedBuilder,
	SlashCommandBuilder,
	PermissionFlagsBits,
} = require('discord.js');
const { Server } = require('../../../data/models.js');
const Translate = require('../../../utils/translations.js');
const { deleteAllOrderLogThreads, ensureAllOrderLogThreads } = require('../../../utils/orderBoardLog.js');
const { previewServerWarData } = require('../../../utils/serverReset.js');
const { getWarStatusSummary } = require('../../../utils/foxholeWarApi.js');
const { encode } = require('../../../shared/customId.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('server')
		.setNameLocalizations({
			fr: 'serveur',
			ru: 'сервер',
			'zh-CN': '服务器',
		})
		.setDescription('Commands to manage the server configuration and war reset.')
		.setDescriptionLocalizations({
			fr: 'Commandes pour gérer la configuration du serveur et le reset de guerre.',
			ru: 'Команды для настройки сервера и сброса данных войны.',
			'zh-CN': '管理服务器配置与战争数据重置的命令。',
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
							{ name: 'Russian', value: 'ru' },
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
		)
		.addSubcommand((subcommand) =>
			subcommand
				.setName('logs')
				.setNameLocalizations({
					fr: 'logs',
					ru: 'логи',
					'zh-CN': '日志',
				})
				.setDescription('Enable or disable order board Logs threads.')
				.setDescriptionLocalizations({
					fr: 'Active ou désactive les threads Logs des tableaux de commandes.',
					ru: 'Включает или отключает треды логов досок заказов.',
					'zh-CN': '启用或禁用订单面板的日志讨论串。',
				})
				.addBooleanOption((option) =>
					option
						.setName('enabled')
						.setNameLocalizations({
							fr: 'actif',
							ru: 'включено',
							'zh-CN': '启用',
						})
						.setDescription('Create Logs threads for new / refreshed order boards.')
						.setDescriptionLocalizations({
							fr: 'Créer des threads Logs pour les tableaux de commandes.',
							ru: 'Создавать треды логов для досок заказов.',
							'zh-CN': '为订单面板创建日志讨论串。',
						})
						.setRequired(true),
				),
		)
		.addSubcommand((subcommand) =>
			subcommand
				.setName('reset')
				.setNameLocalizations({
					fr: 'reset',
					ru: 'сброс',
					'zh-CN': '重置',
				})
				.setDescription('Wipe order boards, stockpiles and operations for a new war (Manage Server).')
				.setDescriptionLocalizations({
					fr: 'Effacer tableaux de commandes, stocks et opérations pour une nouvelle guerre (Gérer le serveur).',
					ru: 'Удалить доски заказов, склады и операции для новой войны (Управлять сервером).',
					'zh-CN': '为新战争清空订单面板、库存与行动（需要管理服务器）。',
				}),
		),

	async execute(interaction) {
		const guild = interaction.member.guild;
		const subcommand = interaction.options.getSubcommand();
		const server = await Server.findOne({ guild_id: guild.id });
		const translations = new Translate(interaction.client, guild.id);

		if (!server) {
			return interaction.reply({
				content: translations.translate('SERVER_IS_NOT_INIT'),
				flags: 64,
			});
		}

		const logsEnabled = Boolean(server.logs);
		const embed = new EmbedBuilder()
			.setTitle(translations.translate('SERVER_TITLE_CONFIGURATION'))
			.addFields(
				{ name: translations.translate('SERVER_FIELD_GUILD_NAME'), value: guild.name, inline: false },
				{ name: translations.translate('SERVER_FIELD_GUILD_ID'), value: guild.id, inline: false },
				{ name: translations.translate('SERVER_FIELD_GUILD_LANG'), value: server.lang, inline: false },
				{ name: translations.translate('SERVER_FIELD_GUILD_CAMP'), value: server.camp, inline: false },
				{
					name: translations.translate('SERVER_FIELD_GUILD_LOGS'),
					value: translations.translate(logsEnabled ? 'SERVER_LOGS_ENABLED' : 'SERVER_LOGS_DISABLED'),
					inline: false,
				},
			);

		const lang = interaction.options.getString('lang');
		const camp = interaction.options.getString('camp');

		switch (subcommand) {
		case 'infos':
			return interaction.reply({
				embeds: [embed],
				flags: 64,
			});
		case 'lang':
			await Server.findOneAndUpdate(
				{ guild_id: guild.id },
				{ lang: lang },
				{ returnDocument: 'after' },
			);

			interaction.client.traductions.set(guild.id, lang);

			return interaction.reply({
				content: translations.translate('SERVER_SET_LANG_REPLY', { lang: lang.toUpperCase() }),
				flags: 64,
			});
		case 'camp':
			await Server.findOneAndUpdate(
				{ guild_id: guild.id },
				{ camp: camp },
				{ returnDocument: 'after' },
			);

			return interaction.reply({
				content: translations.translate('SERVER_SET_CAMP_REPLY', { camp: camp.toUpperCase() }),
				flags: 64,
			});
		case 'logs': {
			const enabled = interaction.options.getBoolean('enabled');
			await Server.findOneAndUpdate(
				{ guild_id: guild.id },
				{ logs: enabled },
				{ returnDocument: 'after' },
			);

			if (!enabled) {
				await deleteAllOrderLogThreads(interaction.client, guild.id);
			}
			else {
				await ensureAllOrderLogThreads(interaction.client, guild.id);
			}

			return interaction.reply({
				content: translations.translate(
					enabled ? 'SERVER_SET_LOGS_ON_REPLY' : 'SERVER_SET_LOGS_OFF_REPLY',
				),
				flags: 64,
			});
		}
		case 'reset': {
			const canManage = interaction.member?.permissions?.has(PermissionFlagsBits.ManageGuild);
			if (!canManage) {
				return interaction.reply({
					content: translations.translate('NO_PERMS'),
					flags: 64,
				});
			}

			const [preview, war] = await Promise.all([
				previewServerWarData(guild.id),
				getWarStatusSummary().catch(() => ({ available: false })),
			]);

			const previewText = translations.translate('SERVER_RESET_PREVIEW', {
				boards: preview.boards,
				stockpiles: preview.stockpiles,
				operations: preview.operations,
			});
			const warActive = Boolean(war?.available && !war.ended);
			const content = warActive
				? `${translations.translate('SERVER_RESET_WAR_WARNING', {
					war: war.warNumber,
					day: war.dayOfWar ?? '?',
				})}\n\n${previewText}`
				: previewText;

			const row = new ActionRowBuilder().addComponents(
				new ButtonBuilder()
					.setCustomId(encode('server_reset_confirm'))
					.setLabel(translations.translate('CONFIRM'))
					.setStyle(ButtonStyle.Danger),
				new ButtonBuilder()
					.setCustomId(encode('server_reset_cancel'))
					.setLabel(translations.translate('CANCEL'))
					.setStyle(ButtonStyle.Secondary),
			);

			return interaction.reply({
				content,
				components: [row],
				flags: 64,
			});
		}
		default:
			return interaction.reply({
				content: translations.translate('COMMAND_UNKNOWN'),
				flags: 64,
			});
		}
	},
};
