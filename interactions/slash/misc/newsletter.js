const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { NotificationSubscription } = require('../../../data/models.js');
const Translate = require('../../../utils/translations.js');

const NEWSLETTER_TYPE = 'newsletter';

module.exports = {
	data: new SlashCommandBuilder()
		.setName('newsletter')
		.setNameLocalizations({
			fr: 'newsletter',
			ru: 'рассылка',
			'zh-CN': '通讯',
		})
		.setDescription('Subscribe or unsubscribe this channel to the bot newsletter.')
		.setDescriptionLocalizations({
			fr: 'Abonner ou désabonner ce salon à la newsletter du bot.',
			ru: 'Подписать или отписать этот канал от рассылки бота.',
			'zh-CN': '订阅或取消订阅此频道的机器人通讯。',
		})
		.addSubcommand((sub) =>
			sub
				.setName('subscribe')
				.setNameLocalizations({ fr: 'abonner', ru: 'подписать', 'zh-CN': '订阅' })
				.setDescription('Subscribe this channel to the bot newsletter.')
				.setDescriptionLocalizations({
					fr: 'Abonner ce salon à la newsletter du bot.',
					ru: 'Подписать этот канал на рассылку бота.',
					'zh-CN': '将此频道订阅到机器人通讯。',
				}),
		)
		.addSubcommand((sub) =>
			sub
				.setName('unsubscribe')
				.setNameLocalizations({ fr: 'désabonner', ru: 'отписать', 'zh-CN': '取消订阅' })
				.setDescription('Unsubscribe this channel from the bot newsletter.')
				.setDescriptionLocalizations({
					fr: 'Désabonner ce salon de la newsletter du bot.',
					ru: 'Отписать этот канал от рассылки бота.',
					'zh-CN': '取消此频道对机器人通讯的订阅。',
				}),
		),
	async execute(interaction) {
		const { guild, channelId, options, client } = interaction;
		const translations = new Translate(client, guild.id);
		const subcommand = options.getSubcommand();

		const canManage = interaction.member?.permissions?.has(PermissionFlagsBits.ManageGuild);
		if (!canManage) {
			return interaction.reply({
				content: translations.translate('NEWSLETTER_NO_PERMS'),
				flags: 64,
			});
		}

		if (subcommand === 'subscribe') {
			const existing = await NotificationSubscription.findOne({
				guild_id: guild.id,
				channel_id: channelId,
				notification_type: NEWSLETTER_TYPE,
			});
			if (existing) {
				return interaction.reply({
					content: translations.translate('NEWSLETTER_ALREADY_SUBSCRIBED'),
					flags: 64,
				});
			}
			await NotificationSubscription.create({
				guild_id: guild.id,
				channel_id: channelId,
				notification_type: NEWSLETTER_TYPE,
			});
			return interaction.reply({
				content: translations.translate('NEWSLETTER_SUBSCRIBE_SUCCESS'),
				flags: 64,
			});
		}

		if (subcommand === 'unsubscribe') {
			const deleted = await NotificationSubscription.deleteOne({
				guild_id: guild.id,
				channel_id: channelId,
				notification_type: NEWSLETTER_TYPE,
			});
			if (deleted.deletedCount === 0) {
				return interaction.reply({
					content: translations.translate('NEWSLETTER_NOT_SUBSCRIBED'),
					flags: 64,
				});
			}
			return interaction.reply({
				content: translations.translate('NEWSLETTER_UNSUBSCRIBE_SUCCESS'),
				flags: 64,
			});
		}
	},
};
