const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { NotificationSubscription } = require('../../../data/models.js');
const Translate = require('../../../utils/translations.js');

const NOTIFICATION_TYPES = [
	{
		value: 'stockpile_activity',
		name: 'Stockpile activity',
		nameKey: 'NOTIFICATION_TYPE_STOCKPILE_ACTIVITY',
		nameLocalizations: {
			fr: 'Activité des stocks',
			ru: 'Активность складов',
			'zh-CN': '库存活动',
		},
	},
	{
		value: 'stockpile_expiring',
		name: 'Stockpile expiring soon',
		nameKey: 'NOTIFICATION_TYPE_STOCKPILE_EXPIRING',
		nameLocalizations: {
			fr: 'Stocks bientôt expirés',
			ru: 'Склады скоро истекают',
			'zh-CN': '库存即将过期',
		},
	},
];

module.exports = {
	init: true,
	data: new SlashCommandBuilder()
		.setName('notification')
		.setNameLocalizations({
			fr: 'notification',
			ru: 'уведомление',
			'zh-CN': '通知',
		})
		.setDescription('Subscribe channels to activity notifications (e.g. stockpile updates).')
		.setDescriptionLocalizations({
			fr: 'Abonner des salons aux notifications d\'activité (ex. mises à jour des stocks).',
			ru: 'Подписка каналов на уведомления об активности.',
			'zh-CN': '将频道订阅到活动通知（如库存更新）。',
		})
		.addSubcommand((sub) =>
			sub
				.setName('subscribe')
				.setNameLocalizations({ fr: 'abonner', ru: 'подписать', 'zh-CN': '订阅' })
				.setDescription('Subscribe this channel to a notification type.')
				.setDescriptionLocalizations({
					fr: 'Abonner ce salon à un type de notification.',
					ru: 'Подписать этот канал на тип уведомлений.',
					'zh-CN': '将此频道订阅到一种通知类型。',
				})
				.addStringOption((opt) => {
					opt
						.setName('type')
						.setNameLocalizations({ fr: 'type', ru: 'тип', 'zh-CN': '类型' })
						.setDescription('Notification type')
						.setDescriptionLocalizations({
							fr: 'Type de notification',
							ru: 'Тип уведомлений',
							'zh-CN': '通知类型',
						})
						.setRequired(true);
					NOTIFICATION_TYPES.forEach((t) =>
						opt.addChoices({
							name: t.name,
							value: t.value,
							nameLocalizations: t.nameLocalizations,
						}),
					);
					return opt;
				}),
		)
		.addSubcommand((sub) =>
			sub
				.setName('unsubscribe')
				.setNameLocalizations({ fr: 'désabonner', ru: 'отписать', 'zh-CN': '取消订阅' })
				.setDescription('Unsubscribe this channel from a notification type.')
				.setDescriptionLocalizations({
					fr: 'Désabonner ce salon d\'un type de notification.',
					ru: 'Отписать этот канал от типа уведомлений.',
					'zh-CN': '取消此频道对某种通知类型的订阅。',
				})
				.addStringOption((opt) => {
					opt
						.setName('type')
						.setNameLocalizations({ fr: 'type', ru: 'тип', 'zh-CN': '类型' })
						.setDescription('Notification type')
						.setDescriptionLocalizations({
							fr: 'Type de notification',
							ru: 'Тип уведомлений',
							'zh-CN': '通知类型',
						})
						.setRequired(true);
					NOTIFICATION_TYPES.forEach((t) =>
						opt.addChoices({
							name: t.name,
							value: t.value,
							nameLocalizations: t.nameLocalizations,
						}),
					);
					return opt;
				}),
		)
		.addSubcommand((sub) =>
			sub
				.setName('list')
				.setNameLocalizations({ fr: 'liste', ru: 'список', 'zh-CN': '列表' })
				.setDescription('List channels subscribed to notifications on this server.')
				.setDescriptionLocalizations({
					fr: 'Lister les salons abonnés aux notifications sur ce serveur.',
					ru: 'Список каналов с подпиской на уведомления.',
					'zh-CN': '列出本服务器已订阅通知的频道。',
				}),
		),
	async execute(interaction) {
		const { guild, channelId, options } = interaction;
		const translations = new Translate(interaction.client, guild.id);
		const subcommand = options.getSubcommand();

		const canManage = interaction.member?.permissions?.has(PermissionFlagsBits.ManageChannels);

		if (subcommand === 'subscribe') {
			if (!canManage) {
				return interaction.reply({
					content: translations.translate('NOTIFICATION_NO_PERMS'),
					flags: 64,
				});
			}
			const type = options.getString('type');
			const existing = await NotificationSubscription.findOne({
				guild_id: guild.id,
				channel_id: channelId,
				notification_type: type,
			});
			if (existing) {
				return interaction.reply({
					content: translations.translate('NOTIFICATION_ALREADY_SUBSCRIBED'),
					flags: 64,
				});
			}
			await NotificationSubscription.create({
				guild_id: guild.id,
				channel_id: channelId,
				notification_type: type,
			});
			return interaction.reply({
				content: translations.translate('NOTIFICATION_SUBSCRIBE_SUCCESS'),
				flags: 64,
			});
		}

		if (subcommand === 'unsubscribe') {
			if (!canManage) {
				return interaction.reply({
					content: translations.translate('NOTIFICATION_NO_PERMS'),
					flags: 64,
				});
			}
			const type = options.getString('type');
			const deleted = await NotificationSubscription.deleteOne({
				guild_id: guild.id,
				channel_id: channelId,
				notification_type: type,
			});
			if (deleted.deletedCount === 0) {
				return interaction.reply({
					content: translations.translate('NOTIFICATION_NOT_SUBSCRIBED'),
					flags: 64,
				});
			}
			return interaction.reply({
				content: translations.translate('NOTIFICATION_UNSUBSCRIBE_SUCCESS'),
				flags: 64,
			});
		}

		if (subcommand === 'list') {
			const all = await NotificationSubscription.find({ guild_id: guild.id }).lean();
			if (all.length === 0) {
				return interaction.reply({
					content: translations.translate('NOTIFICATION_LIST_EMPTY'),
					flags: 64,
				});
			}
			const byType = new Map();
			for (const sub of all) {
				if (!byType.has(sub.notification_type)) byType.set(sub.notification_type, []);
				byType.get(sub.notification_type).push(`<#${sub.channel_id}>`);
			}
			const typeLabel = (t) => translations.translate(NOTIFICATION_TYPES.find((x) => x.value === t)?.nameKey ?? t);
			const lines = [];
			for (const [type, channelIds] of byType) {
				lines.push(`**${typeLabel(type)}**: ${channelIds.join(', ')}`);
			}
			return interaction.reply({
				content: `${translations.translate('NOTIFICATION_LIST_HEADER')}\n${lines.join('\n')}`,
				flags: 64,
			});
		}
	},
};
