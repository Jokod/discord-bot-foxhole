const {
	SlashCommandBuilder,
} = require('discord.js');
const { Stockpile, TrackedMessage } = require('../../../data/models.js');
const Translate = require('../../../utils/translations.js');
const { editTrackedOrFallback } = require('../../../utils/trackedMessage.js');
const {
	buildStockpileListPayload,
	buildStockpileManagePayload,
} = require('../../embeds/stockpileList.js');
const { canAccessStockpileManage } = require('../../../utils/stockpile-permissions.js');
const { v2Text, isComponentsV2Message } = require('../../../utils/componentsV2.js');
const { buildLabeledModal, TextInputStyle } = require('../../../utils/modalLabels.js');

module.exports = {
	init: true,
	data: new SlashCommandBuilder()
		.setName('stockpile')
		.setNameLocalizations({
			'es-ES': 'deposito',
			fr: 'depot',
			ru: 'склад',
			'zh-CN': '库存',
		})
		.setDescription('Manage stockpile codes.')
		.setDescriptionLocalizations({
			'es-ES': 'Gestionar los códigos de depósito.',
			fr: 'Gérer les codes de dépôt.',
			ru: 'Управление кодами складов.',
			'zh-CN': '管理库存代码。',
		})
		.addSubcommand((subcommand) =>
			subcommand
				.setName('add')
				.setNameLocalizations({
					'es-ES': 'anadir',
					fr: 'ajouter',
					ru: 'добавить',
					'zh-CN': '加',
				})
				.setDescription('Open a form to add a stockpile.')
				.setDescriptionLocalizations({
					'es-ES': 'Abre el formulario para añadir un depósito.',
					fr: 'Ouvre le formulaire d\'ajout d\'un dépôt.',
					ru: 'Открыть форму добавления склада.',
					'zh-CN': '打开添加库存表单。',
				}),
		)
		.addSubcommand((subcommand) =>
			subcommand
				.setName('list')
				.setNameLocalizations({
					'es-ES': 'lista',
					fr: 'liste',
					ru: 'список',
					'zh-CN': '列表',
				})
				.setDescription('Display stockpiles by region and city.')
				.setDescriptionLocalizations({
					'es-ES': 'Muestra los depósitos por región y ciudad.',
					fr: 'Affiche les dépôts par région et ville.',
					ru: 'Показать склады по региону и городу.',
					'zh-CN': '按地区和城市显示库存。',
				}),
		)
		.addSubcommand((subcommand) =>
			subcommand
				.setName('manage')
				.setNameLocalizations({
					'es-ES': 'gestionar',
					fr: 'gérer',
					ru: 'управление',
					'zh-CN': '管理',
				})
				.setDescription('Ephemeral panel to remove stockpiles (owner or manage perms).')
				.setDescriptionLocalizations({
					'es-ES': 'Panel efímero para eliminar depósitos (creador o permisos).',
					fr: 'Panneau éphémère pour supprimer des dépôts (créateur ou perms).',
					ru: 'Эфемерная панель удаления складов (создатель или права).',
					'zh-CN': '临时管理面板，用于删除库存（创建者或管理权限）。',
				}),
		),
	async execute(interaction) {
		const { client, guild, options } = interaction;
		const translations = new Translate(client, guild?.id);
		if (!guild) {
			return interaction.reply(v2Text(translations.translate('NO_DM'), { ephemeral: true }));
		}
		const subcommand = options.getSubcommand();

		const MESSAGE_TYPE = 'stockpile_list';
		const expectedListTitle = `🔑 ${translations.translate('STOCKPILE_LIST_CODES')}`;
		const fallbackMatcher = (msgs) =>
			msgs.find((m) => {
				if (m.author?.id !== client.user.id) return false;
				if (m.embeds?.[0]?.title === expectedListTitle) return true;
				if (isComponentsV2Message(m)) {
					const raw = JSON.stringify(m.components ?? []);
					return raw.includes(expectedListTitle);
				}
				return false;
			}) ?? null;

		switch (subcommand) {
		case 'add':
			{
				const modal = buildLabeledModal({
					customId: 'modal_stockpile_add',
					title: translations.translate('STOCKPILE'),
					fields: [
						{
							customId: 'stock_region',
							label: translations.translate('STOCKPILE_REGION'),
							description: translations.translate('STOCKPILE_DESC_REGION'),
							placeholder: translations.translate('STOCKPILE_PLACEHOLDER_REGION'),
							style: TextInputStyle.Short,
							minLength: 2,
							maxLength: 50,
							required: true,
						},
						{
							customId: 'stock_city',
							label: translations.translate('STOCKPILE_CITY'),
							description: translations.translate('STOCKPILE_DESC_CITY'),
							placeholder: translations.translate('STOCKPILE_PLACEHOLDER_CITY'),
							style: TextInputStyle.Short,
							minLength: 2,
							maxLength: 50,
							required: true,
						},
						{
							customId: 'stock_name',
							label: translations.translate('NAME'),
							description: translations.translate('STOCKPILE_DESC_NAME'),
							placeholder: translations.translate('STOCKPILE_PLACEHOLDER_NAME'),
							style: TextInputStyle.Short,
							minLength: 3,
							maxLength: 50,
							required: true,
						},
						{
							customId: 'stock_code',
							label: translations.translate('PASSWORD'),
							description: translations.translate('STOCKPILE_DESC_CODE'),
							placeholder: translations.translate('STOCKPILE_PLACEHOLDER_CODE'),
							style: TextInputStyle.Short,
							minLength: 6,
							maxLength: 6,
							required: true,
						},
					],
				});

				await interaction.showModal(modal);
			}
			break;

		case 'list': {
			await interaction.deferReply();
			const payload = await buildStockpileListPayload(Stockpile, guild.id, translations);
			const result = await editTrackedOrFallback({
				channel: interaction.channel,
				serverId: guild.id,
				messageType: MESSAGE_TYPE,
				model: TrackedMessage,
				fallbackMatcher,
				editPayload: payload,
				fallbackSend: () => interaction.editReply(payload),
			});
			// Edited in-channel, or legacy cutover reposted via channel.send — drop the deferred ack.
			// Only keep the interaction reply when it *is* the list (fallbackSend = editReply).
			if (!result.usedFallback || result.reposted) {
				await interaction.deleteReply().catch(() => undefined);
			}
			break;
		}

		case 'manage': {
			if (!(await canAccessStockpileManage(interaction, Stockpile))) {
				return interaction.reply(v2Text(translations.translate('STOCKPILE_MANAGE_NO_ACCESS'), { ephemeral: true }));
			}

			await interaction.deferReply({ flags: 64 });
			const payload = await buildStockpileManagePayload(Stockpile, guild.id, translations);
			await interaction.editReply(payload);
			break;
		}

		default:
			return interaction.reply(v2Text(translations.translate('COMMAND_UNKNOWN'), { ephemeral: true }));
		}
	},
};
