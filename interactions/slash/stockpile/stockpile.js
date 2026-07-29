const {
	SlashCommandBuilder,
	ActionRowBuilder,
	ModalBuilder,
	TextInputBuilder,
	TextInputStyle,
} = require('discord.js');
const { Stockpile, TrackedMessage } = require('../../../data/models.js');
const Translate = require('../../../utils/translations.js');
const { editTrackedOrFallback } = require('../../../utils/trackedMessage.js');
const { buildStockpileListEmbed, buildStockpileListComponents } = require('../../embeds/stockpileList.js');

module.exports = {
	init: true,
	data: new SlashCommandBuilder()
		.setName('stockpile')
		.setNameLocalizations({
			fr: 'depot',
			ru: 'склад',
			'zh-CN': '库存',
		})
		.setDescription('Manage stockpile codes.')
		.setDescriptionLocalizations({
			fr: 'Gérer les codes de dépôt.',
			ru: 'Управление кодами складов.',
			'zh-CN': '管理库存代码。',
		})
		.addSubcommand((subcommand) =>
			subcommand
				.setName('add')
				.setNameLocalizations({
					fr: 'ajouter',
					ru: 'добавить',
					'zh-CN': '加',
				})
				.setDescription('Open a form to add a stockpile.')
				.setDescriptionLocalizations({
					fr: 'Ouvre le formulaire d\'ajout d\'un dépôt.',
					ru: 'Открыть форму добавления склада.',
					'zh-CN': '打开添加库存表单。',
				}),
		)
		.addSubcommand((subcommand) =>
			subcommand
				.setName('list')
				.setNameLocalizations({
					fr: 'liste',
					ru: 'список',
					'zh-CN': '列表',
				})
				.setDescription('Display stockpiles by region and city.')
				.setDescriptionLocalizations({
					fr: 'Affiche les dépôts par région et ville.',
					ru: 'Показать склады по региону и городу.',
					'zh-CN': '按地区和城市显示库存。',
				}),
		),
	async execute(interaction) {
		const { client, guild, options } = interaction;
		const translations = new Translate(client, guild?.id);
		if (!guild) {
			return interaction.reply({
				content: translations.translate('NO_DM'),
				flags: 64,
			});
		}
		const subcommand = options.getSubcommand();

		const MESSAGE_TYPE = 'stockpile_list';
		const expectedListTitle = `🔑 ${translations.translate('STOCKPILE_LIST_CODES')}`;
		const fallbackMatcher = (msgs) =>
			msgs.find((m) => m.author?.id === client.user.id && m.embeds?.[0]?.title === expectedListTitle) ?? null;

		switch (subcommand) {
		case 'add':
			{
				const modal = new ModalBuilder()
					.setCustomId('modal_stockpile_add')
					.setTitle(translations.translate('STOCKPILE'));

				const regionInput = new TextInputBuilder()
					.setCustomId('stock_region')
					.setLabel(translations.translate('STOCKPILE_REGION'))
					.setPlaceholder(translations.translate('STOCKPILE_PLACEHOLDER_REGION'))
					.setStyle(TextInputStyle.Short)
					.setMinLength(2)
					.setMaxLength(50)
					.setRequired(true);

				const cityInput = new TextInputBuilder()
					.setCustomId('stock_city')
					.setLabel(translations.translate('STOCKPILE_CITY'))
					.setPlaceholder(translations.translate('STOCKPILE_PLACEHOLDER_CITY'))
					.setStyle(TextInputStyle.Short)
					.setMinLength(2)
					.setMaxLength(50)
					.setRequired(true);

				const nameInput = new TextInputBuilder()
					.setCustomId('stock_name')
					.setLabel(translations.translate('NAME'))
					.setPlaceholder(translations.translate('STOCKPILE_PLACEHOLDER_NAME'))
					.setStyle(TextInputStyle.Short)
					.setMinLength(3)
					.setMaxLength(50)
					.setRequired(true);

				const codeInput = new TextInputBuilder()
					.setCustomId('stock_code')
					.setLabel(translations.translate('PASSWORD'))
					.setPlaceholder(translations.translate('STOCKPILE_PLACEHOLDER_CODE'))
					.setStyle(TextInputStyle.Short)
					.setMinLength(6)
					.setMaxLength(6)
					.setRequired(true);

				modal.addComponents(
					new ActionRowBuilder().addComponents(regionInput),
					new ActionRowBuilder().addComponents(cityInput),
					new ActionRowBuilder().addComponents(nameInput),
					new ActionRowBuilder().addComponents(codeInput),
				);

				await interaction.showModal(modal);
			}
			break;

		case 'list': {
			await interaction.deferReply();
			const { embed, isEmpty: listEmpty } = await buildStockpileListEmbed(Stockpile, guild.id, translations);
			let result;
			if (listEmpty) {
				result = await editTrackedOrFallback({
					channel: interaction.channel,
					serverId: guild.id,
					messageType: MESSAGE_TYPE,
					model: TrackedMessage,
					fallbackMatcher,
					editPayload: {
						content: translations.translate('STOCKPILE_LIST_EMPTY'),
						embeds: [],
						components: [],
					},
					fallbackSend: () => interaction.editReply({
						content: translations.translate('STOCKPILE_LIST_EMPTY'),
						embeds: [],
						components: [],
					}),
				});
			}
			else {
				const components = await buildStockpileListComponents(Stockpile, guild.id, translations);
				const payload = { content: '', embeds: [embed], components };
				result = await editTrackedOrFallback({
					channel: interaction.channel,
					serverId: guild.id,
					messageType: MESSAGE_TYPE,
					model: TrackedMessage,
					fallbackMatcher,
					editPayload: payload,
					fallbackSend: () => interaction.editReply(payload),
				});
			}
			if (!result.usedFallback) {
				await interaction.deleteReply().catch(() => undefined);
			}
			break;
		}

		default:
			return interaction.reply({
				content: translations.translate('COMMAND_UNKNOWN'),
				flags: 64,
			});
		}
	},
};
