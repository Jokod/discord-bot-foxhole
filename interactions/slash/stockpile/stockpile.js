const {
	SlashCommandBuilder,
	EmbedBuilder,
	ActionRowBuilder,
	ModalBuilder,
	TextInputBuilder,
	TextInputStyle,
	PermissionFlagsBits,
} = require('discord.js');
const { Stockpile } = require('../../../data/models.js');
const Translate = require('../../../utils/translations.js');
const { getRandomColor } = require('../../../utils/colors.js');
const { buildStockpileListEmbed } = require('../../embeds/stockpileList.js');
const { sendToSubscribers } = require('../../../utils/notifications.js');

module.exports = {
	init: true,
	data: new SlashCommandBuilder()
		.setName('stockpile')
		.setNameLocalizations({
			fr: 'stock',
			ru: 'склад',
			'zh-CN': '库存',
		})
		.setDescription('Manage stockpile codes.')
		.setDescriptionLocalizations({
			fr: 'Gérer les codes de stock.',
			ru: 'Управление кодами складов.',
			'zh-CN': '管理库存代码。',
		})
		.addSubcommand((subcommand) =>
			subcommand
				.setName('help')
				.setNameLocalizations({
					fr: 'aide',
					ru: 'помощь',
					'zh-CN': '帮助',
				})
				.setDescription('Show available stockpile commands.')
				.setDescriptionLocalizations({
					fr: 'Affiche les commandes disponibles.',
					ru: 'Показать доступные команды.',
					'zh-CN': '显示可用命令。',
				}),
		)
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
					fr: 'Ouvre le formulaire d\'ajout d\'un stock.',
					ru: 'Открыть форму добавления склада.',
					'zh-CN': '打开添加库存表单。',
				}),
		)
		.addSubcommand((subcommand) =>
			subcommand
				.setName('remove')
				.setNameLocalizations({
					fr: 'supprimer',
					ru: 'удалить',
					'zh-CN': '删除',
				})
				.setDescription('Mark a stockpile as deleted (only the creator can).')
				.setDescriptionLocalizations({
					fr: 'Marque un stock comme supprimé (réservé au créateur).',
					ru: 'Пометить склад как удалённый (только создатель).',
					'zh-CN': '将库存标记为已删除（仅创建者）。',
				})
				.addStringOption((option) =>
					option
						.setName('id')
						.setNameLocalizations({
							fr: 'id',
							ru: 'номер',
							'zh-CN': '编号',
						})
						.setDescription('Stockpile number (from the list).')
						.setDescriptionLocalizations({
							fr: 'Numéro du stock (voir la liste).',
							ru: 'Номер склада (из списка).',
							'zh-CN': '库存编号（见列表）。',
						})
						.setRequired(true),
				),
		)
		.addSubcommand((subcommand) =>
			subcommand
				.setName('restore')
				.setNameLocalizations({
					fr: 'réactiver',
					ru: 'восстановить',
					'zh-CN': '恢复',
				})
				.setDescription('Restore a deleted stockpile (creator only).')
				.setDescriptionLocalizations({
					fr: 'Réactive un stock marqué supprimé (créateur uniquement).',
					ru: 'Восстановить помеченный склад (только создатель).',
					'zh-CN': '恢复已删除的库存（仅创建者）。',
				})
				.addStringOption((option) =>
					option
						.setName('id')
						.setNameLocalizations({
							fr: 'id',
							ru: 'номер',
							'zh-CN': '编号',
						})
						.setDescription('Stockpile number to restore.')
						.setDescriptionLocalizations({
							fr: 'Numéro du stock à réactiver.',
							ru: 'Номер склада для восстановления.',
							'zh-CN': '要恢复的库存编号。',
						})
						.setRequired(true),
				),
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
					fr: 'Affiche les stocks par région et ville.',
					ru: 'Показать склады по региону и городу.',
					'zh-CN': '按地区和城市显示库存。',
				}),
		)
		.addSubcommand((subcommand) =>
			subcommand
				.setName('reset')
				.setNameLocalizations({
					fr: 'reset',
					ru: 'сброс',
					'zh-CN': '重置',
				})
				.setDescription('Reset a stockpile timer to 2 days.')
				.setDescriptionLocalizations({
					fr: 'Remet le délai d\'un stock à 2 jours.',
					ru: 'Сбросить таймер склада на 2 дня.',
					'zh-CN': '将库存计时重置为 2 天。',
				})
				.addStringOption((option) =>
					option
						.setName('id')
						.setNameLocalizations({
							fr: 'id',
							ru: 'номер',
							'zh-CN': '编号',
						})
						.setDescription('Stockpile number to reset.')
						.setDescriptionLocalizations({
							fr: 'Numéro du stock à réinitialiser.',
							ru: 'Номер склада для сброса.',
							'zh-CN': '要重置的库存编号。',
						})
						.setRequired(true),
				),
		)
		.addSubcommand((subcommand) =>
			subcommand
				.setName('cleanup')
				.setNameLocalizations({
					fr: 'nettoyer',
					ru: 'очистка',
					'zh-CN': '清理',
				})
				.setDescription('Permanently remove deleted stockpiles from this channel.')
				.setDescriptionLocalizations({
					fr: 'Supprime définitivement les stocks marqués comme supprimés dans ce salon.',
					ru: 'Окончательно удалить помеченные склады в этом канале.',
					'zh-CN': '永久移除此频道中已标记删除的库存。',
				}),
		)
		.addSubcommand((subcommand) =>
			subcommand
				.setName('deleteall')
				.setNameLocalizations({
					fr: 'supprimer_tout',
					ru: 'удалить_всё',
					'zh-CN': '全部删除',
				})
				.setDescription('Permanently delete all stockpiles on this server.')
				.setDescriptionLocalizations({
					fr: 'Supprime définitivement tous les stocks du serveur.',
					ru: 'Окончательно удаляет все склады на сервере.',
					'zh-CN': '永久删除本服务器所有库存。',
				}),
		),
	async execute(interaction) {
		const { client, guild, options, channelId } = interaction;
		const translations = new Translate(client, guild.id);
		const subcommand = options.getSubcommand();

		const validateId = (id) => /^\d+$/.test(id);

		switch (subcommand) {
		case 'help':
			const commandNames = client.slashCommands
				.filter((command) => command.data.name === 'stockpile')
				.map((command) => command.data.options.map((option) => option.name))
				.flat()
				.join(', ');

			const helpEmbed = new EmbedBuilder()
				.setColor(getRandomColor())
				.setTitle(translations.translate('STOCKPILE_LIST_COMMANDS'))
				.setDescription(`\`${commandNames}\``);

			await interaction.reply({
				embeds: [helpEmbed],
				flags: 64,
			});
			break;

		case 'add':
			{
				const modal = new ModalBuilder()
					.setCustomId('modal_stockpile_add')
					.setTitle(translations.translate('STOCKPILE') || 'Stockpile');

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

		case 'remove':
			const stockId = options.getString('id');

			if (!validateId(stockId)) {
				return interaction.reply({
					content: translations.translate('STOCKPILE_INVALID_ID'),
					flags: 64,
				});
			}

			const stock = await Stockpile.findOne({ server_id: guild.id, id: stockId });

			if (!stock || stock.server_id !== guild.id) {
				return interaction.reply({
					content: translations.translate('STOCKPILE_NOT_EXIST'),
					flags: 64,
				});
			}

			// Seul le créateur peut supprimer (owner_id '0' = legacy migré : tout le monde peut).
			if (stock.owner_id && stock.owner_id !== '0' && stock.owner_id !== interaction.user.id) {
				return interaction.reply({
					content: translations.translate('STOCKPILE_ARE_NO_OWNER_ERROR'),
					flags: 64,
				});
			}

			// Étape 1 : marquage comme supprimé (suppression logique)
			if (stock.deleted) {
				return interaction.reply({
					content: translations.translate('STOCKPILE_ALREADY_DELETED'),
					flags: 64,
				});
			}

			stock.deleted = true;
			stock.deletedAt = new Date();
			await stock.save();

			await interaction.reply({
				content: translations.translate('STOCKPILE_MARK_DELETED_SUCCESS'),
				flags: 64,
			});
			sendToSubscribers(interaction.client, guild.id, 'stockpile_activity', (t) => ({
				content: t.translate('NOTIFICATION_STOCKPILE_REMOVED', {
					user: `<@${interaction.user.id}>`,
					name: stock.name,
					id: stock.id,
				}),
			})).catch(() => undefined);
			const { embed: listEmbed, isEmpty } = await buildStockpileListEmbed(Stockpile, guild.id, translations);
			await interaction.followUp(
				isEmpty ? { content: translations.translate('STOCKPILE_LIST_EMPTY'), flags: 64 } : { embeds: [listEmbed] },
			);
			break;

		case 'restore': {
			const restoreId = options.getString('id');
			if (!validateId(restoreId)) {
				return interaction.reply({
					content: translations.translate('STOCKPILE_INVALID_ID'),
					flags: 64,
				});
			}
			const stockToRestore = await Stockpile.findOne({ server_id: guild.id, id: restoreId });
			if (!stockToRestore || stockToRestore.server_id !== guild.id) {
				return interaction.reply({
					content: translations.translate('STOCKPILE_NOT_EXIST'),
					flags: 64,
				});
			}
			if (!stockToRestore.deleted) {
				return interaction.reply({
					content: translations.translate('STOCKPILE_NOT_DELETED'),
					flags: 64,
				});
			}
			// owner_id '0' = legacy migré : tout le monde peut réactiver.
			if (stockToRestore.owner_id && stockToRestore.owner_id !== '0' && stockToRestore.owner_id !== interaction.user.id) {
				return interaction.reply({
					content: translations.translate('STOCKPILE_ARE_NO_OWNER_ERROR'),
					flags: 64,
				});
			}
			stockToRestore.deleted = false;
			stockToRestore.deletedAt = null;
			await stockToRestore.save();

			await interaction.reply({
				content: translations.translate('STOCKPILE_RESTORE_SUCCESS'),
				flags: 64,
			});
			sendToSubscribers(interaction.client, guild.id, 'stockpile_activity', (t) => ({
				content: t.translate('NOTIFICATION_STOCKPILE_RESTORED', {
					user: `<@${interaction.user.id}>`,
					name: stockToRestore.name,
					id: stockToRestore.id,
				}),
			})).catch(() => undefined);
			const { embed: restoreEmbed, isEmpty: restoreEmpty } = await buildStockpileListEmbed(Stockpile, guild.id, translations);
			await interaction.followUp(
				restoreEmpty ? { content: translations.translate('STOCKPILE_LIST_EMPTY'), flags: 64 } : { embeds: [restoreEmbed] },
			);
			break;
		}

		case 'list': {
			const { embed, isEmpty: listEmpty } = await buildStockpileListEmbed(Stockpile, guild.id, translations);
			if (listEmpty) {
				return interaction.reply({
					content: translations.translate('STOCKPILE_LIST_EMPTY'),
					flags: 64,
				});
			}
			await interaction.reply({
				embeds: [embed],
			});
			break;
		}

		case 'reset': {
			const resetId = options.getString('id');

			if (!validateId(resetId)) {
				return interaction.reply({
					content: translations.translate('STOCKPILE_INVALID_ID'),
					flags: 64,
				});
			}

			const stockToReset = await Stockpile.findOne({ server_id: guild.id, id: resetId });

			if (!stockToReset || stockToReset.server_id !== guild.id) {
				return interaction.reply({
					content: translations.translate('STOCKPILE_NOT_EXIST'),
					flags: 64,
				});
			}

			const resetNow = new Date();
			stockToReset.lastResetAt = resetNow;
			stockToReset.expiresAt = new Date(resetNow.getTime() + 2 * 24 * 60 * 60 * 1000);
			stockToReset.expiry_reminders_sent = [];
			await stockToReset.save();

			sendToSubscribers(interaction.client, guild.id, 'stockpile_activity', (t) => ({
				content: t.translate('NOTIFICATION_STOCKPILE_RESET', {
					user: `<@${interaction.user.id}>`,
					name: stockToReset.name,
					id: stockToReset.id,
				}),
			})).catch(() => undefined);

			return interaction.reply({
				content: translations.translate('STOCKPILE_RESET_SUCCESS'),
				flags: 64,
			});
		}

		case 'cleanup': {
			const canManageChannels = interaction.member?.permissions?.has(PermissionFlagsBits.ManageChannels);
			if (!canManageChannels) {
				return interaction.reply({
					content: translations.translate('NO_PERMS'),
					flags: 64,
				});
			}
			const result = await Stockpile.deleteMany({
				server_id: guild.id,
				group_id: channelId,
				deleted: true,
			});

			const count = result.deletedCount || 0;
			return interaction.reply({
				content: translations.translate('STOCKPILE_CLEANUP_SUCCESS', { count }),
				flags: 64,
			});
		}

		case 'deleteall': {
			const canManage = interaction.member?.permissions?.has(PermissionFlagsBits.ManageGuild);
			if (!canManage) {
				return interaction.reply({
					content: translations.translate('NO_PERMS'),
					flags: 64,
				});
			}
			await Stockpile.deleteMany({ server_id: guild.id });
			return interaction.reply({
				content: translations.translate('STOCKPILE_RESET_ALL_SUCCESS'),
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