const {
	SlashCommandBuilder,
} = require('discord.js');
const { Operation } = require('../../../data/models.js');
const Translate = require('../../../utils/translations.js');
const { safeEscapeMarkdown } = require('../../../utils/markdown.js');
const { canManageBoard } = require('../../../utils/order-permissions.js');
const {
	createBoard,
	deleteBoard,
	findBoardByChannelAndName,
} = require('../../../services/order/index.js');

module.exports = {
	init: true,
	data: new SlashCommandBuilder()
		.setName('order')
		.setNameLocalizations({
			fr: 'commande',
			ru: 'заказ',
			'zh-CN': '订单',
		})
		.setDescription('Manage order boards (production, front transfer, scrap).')
		.setDescriptionLocalizations({
			fr: 'Gérer les tableaux de commande (prod, transfert front, scrap).',
			ru: 'Управление досками заказов (производство, фронт, scrap).',
			'zh-CN': '管理订单面板（生产、前线转运、废料）。',
		})
		.addSubcommand((subcommand) =>
			subcommand
				.setName('create')
				.setNameLocalizations({ fr: 'créer', ru: 'создать', 'zh-CN': '创建' })
				.setDescription('Create an order board in this channel.')
				.setDescriptionLocalizations({
					fr: 'Créer un tableau de commande dans ce salon.',
					ru: 'Создать доску заказа в этом канале.',
					'zh-CN': '在此频道创建订单面板。',
				})
				.addStringOption((option) =>
					option
						.setName('type')
						.setNameLocalizations({ fr: 'type', ru: 'тип', 'zh-CN': '类型' })
						.setDescription('Board type.')
						.setDescriptionLocalizations({
							fr: 'Type de tableau.',
							ru: 'Тип доски.',
							'zh-CN': '面板类型。',
						})
						.setRequired(true)
						.addChoices(
							{
								name: 'Production',
								name_localizations: { fr: 'Production', ru: 'Производство', 'zh-CN': '生产' },
								value: 'prod',
							},
							{
								name: 'Front transfer',
								name_localizations: { fr: 'Transfert front', ru: 'Доставка на фронт', 'zh-CN': '前线转运' },
								value: 'transfer',
							},
							{
								name: 'Scrap / farm',
								name_localizations: { fr: 'Scrap / farm', ru: 'Scrap / фарм', 'zh-CN': '废料 / 采集' },
								value: 'scrap',
							},
						),
				)
				.addStringOption((option) =>
					option
						.setName('name')
						.setNameLocalizations({ fr: 'nom', ru: 'имя', 'zh-CN': '名称' })
						.setDescription('Name of the order board.')
						.setDescriptionLocalizations({
							fr: 'Nom du tableau de commande.',
							ru: 'Название доски заказа.',
							'zh-CN': '订单面板名称。',
						})
						.setRequired(true)
						.setMinLength(1)
						.setMaxLength(50),
				)
				.addStringOption((option) =>
					option
						.setName('operation')
						.setNameLocalizations({ fr: 'operation', ru: 'операция', 'zh-CN': '行动' })
						.setDescription('Link an active operation (use autocomplete).')
						.setDescriptionLocalizations({
							fr: 'Lier une opération active (utilisez l\'autocomplétion).',
							ru: 'Привязать активную операцию (используйте автодополнение).',
							'zh-CN': '关联进行中的行动（请使用自动完成）。',
						})
						.setRequired(false)
						.setAutocomplete(true),
				)
				.addStringOption((option) =>
					option
						.setName('from')
						.setNameLocalizations({ fr: 'de', ru: 'откуда', 'zh-CN': '起点' })
						.setDescription('Origin (base, hex, stockpile…).')
						.setDescriptionLocalizations({
							fr: 'Origine (base, hex, stockpile…).',
							ru: 'Откуда (база, хекс, склад…).',
							'zh-CN': '起点（基地、地块、仓库…）。',
						})
						.setRequired(false)
						.setMinLength(1)
						.setMaxLength(100),
				)
				.addStringOption((option) =>
					option
						.setName('to')
						.setNameLocalizations({ fr: 'vers', ru: 'куда', 'zh-CN': '终点' })
						.setDescription('Destination (base, hex, stockpile…).')
						.setDescriptionLocalizations({
							fr: 'Destination (base, hex, stockpile…).',
							ru: 'Куда (база, хекс, склад…).',
							'zh-CN': '终点（基地、地块、仓库…）。',
						})
						.setRequired(false)
						.setMinLength(1)
						.setMaxLength(100),
				),
		)
		.addSubcommand((subcommand) =>
			subcommand
				.setName('remove')
				.setNameLocalizations({ fr: 'retirer', ru: 'удалить', 'zh-CN': '删除' })
				.setDescription('Delete an order board in this channel by name.')
				.setDescriptionLocalizations({
					fr: 'Supprimer un tableau de commande de ce salon par son nom.',
					ru: 'Удалить доску заказа канала по имени.',
					'zh-CN': '按名称删除此频道的订单面板。',
				})
				.addStringOption((option) =>
					option
						.setName('name')
						.setNameLocalizations({ fr: 'nom', ru: 'имя', 'zh-CN': '名称' })
						.setDescription('Name of the order board to delete.')
						.setDescriptionLocalizations({
							fr: 'Nom du tableau à supprimer.',
							ru: 'Название удаляемой доски.',
							'zh-CN': '要删除的订单名称。',
						})
						.setRequired(true)
						.setAutocomplete(true)
						.setMinLength(1)
						.setMaxLength(50),
				),
		),

	async execute(interaction) {
		const { client, guild, channel, user, options } = interaction;
		const translations = new Translate(client, guild.id);
		const sub = options.getSubcommand();

		switch (sub) {
		case 'create': {
			const name = options.getString('name').trim();
			const kind = options.getString('type');
			const operationId = options.getString('operation')?.trim() || null;
			const from = options.getString('from')?.trim() || null;
			const to = options.getString('to')?.trim() || null;

			if (!name) {
				return interaction.reply({
					content: translations.translate('ORDER_INVALID_NAME'),
					flags: 64,
				});
			}

			if (operationId) {
				const op = await Operation.findOne({ guild_id: guild.id, operation_id: operationId });
				if (!op) {
					return interaction.reply({
						content: translations.translate('OPERATION_NOT_EXIST'),
						flags: 64,
					});
				}
				if (op.status === 'finished') {
					return interaction.reply({
						content: translations.translate('ORDER_OPERATION_FINISHED'),
						flags: 64,
					});
				}
			}

			await interaction.deferReply({ flags: 64 });

			try {
				await createBoard({
					guildId: guild.id,
					channelId: channel.id,
					ownerId: user.id,
					name,
					kind,
					operationId,
					from,
					to,
					client,
					channel,
				});
				await interaction.deleteReply().catch(() => undefined);
				return undefined;
			}
			catch (err) {
				if (err.code === 'ORDER_ALREADY_EXISTS') {
					return interaction.editReply({
						content: translations.translate('ORDER_ALREADY_EXISTS', { name: safeEscapeMarkdown(name) }),
					});
				}
				throw err;
			}
		}

		case 'remove': {
			const name = options.getString('name').trim();
			if (!name) {
				return interaction.reply({
					content: translations.translate('ORDER_INVALID_NAME'),
					flags: 64,
				});
			}

			const board = await findBoardByChannelAndName(guild.id, channel.id, name);
			if (!board) {
				return interaction.reply({
					content: translations.translate('ORDER_NOT_EXIST', { name: safeEscapeMarkdown(name) }),
					flags: 64,
				});
			}

			if (!canManageBoard(interaction, board)) {
				return interaction.reply({
					content: translations.translate('ORDER_CANNOT_MANAGE_ERROR'),
					flags: 64,
				});
			}

			await interaction.deferReply({ flags: 64 });
			await deleteBoard(board, channel, client);
			await interaction.deleteReply().catch(() => undefined);
			return undefined;
		}
		}
	},
};
