const fs = require('fs');
const path = require('path');
const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { NotificationSubscription } = require('../../../data/models.js');
const { broadcastToSubscribers } = require('../../../utils/notifications.js');
const Translate = require('../../../utils/translations.js');

const NEWSLETTER_TYPE = 'newsletter';
const NEWSLETTER_FILE = path.join(__dirname, '../../../data/newsletter.md');
const DISCORD_CONTENT_LIMIT = 2000;

/**
 * Read markdown content from data/newsletter.md.
 * @returns {{ content: string } | { error: 'missing' | 'empty' | 'too_long', length?: number }}
 */
function readNewsletterFile() {
	if (!fs.existsSync(NEWSLETTER_FILE)) {
		return { error: 'missing' };
	}

	const content = fs.readFileSync(NEWSLETTER_FILE, 'utf8').trim();
	if (!content) {
		return { error: 'empty' };
	}
	if (content.length > DISCORD_CONTENT_LIMIT) {
		return { error: 'too_long', length: content.length };
	}

	return { content };
}

module.exports = {
	NEWSLETTER_FILE,
	readNewsletterFile,
	data: new SlashCommandBuilder()
		.setName('newsletter')
		.setNameLocalizations({
			fr: 'newsletter',
			ru: 'рассылка',
			'zh-CN': '通讯',
		})
		.setDescription('Subscribe this channel to bot news, or publish a newsletter (owner only).')
		.setDescriptionLocalizations({
			fr: 'Abonner ce salon aux actualités du bot, ou publier une newsletter (propriétaire uniquement).',
			ru: 'Подписка канала на новости бота или публикация рассылки (только владелец).',
			'zh-CN': '将此频道订阅到机器人新闻，或发布通讯（仅所有者）。',
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
		)
		.addSubcommand((sub) =>
			sub
				.setName('publish')
				.setNameLocalizations({ fr: 'publier', ru: 'опубликовать', 'zh-CN': '发布' })
				.setDescription('Publish data/newsletter.md to all subscribed channels (bot owner only).')
				.setDescriptionLocalizations({
					fr: 'Publier data/newsletter.md dans tous les salons abonnés (propriétaire du bot uniquement).',
					ru: 'Опубликовать data/newsletter.md во всех подписанных каналах (только владелец бота).',
					'zh-CN': '将 data/newsletter.md 发布到所有已订阅频道（仅机器人所有者）。',
				}),
		),
	async execute(interaction) {
		const { guild, channelId, options, client, user } = interaction;
		const translations = new Translate(client, guild.id);
		const subcommand = options.getSubcommand();

		if (subcommand === 'publish') {
			if (user.id !== process.env.OWNER) {
				return interaction.reply({
					content: translations.translate('OWNER_ONLY'),
					flags: 64,
				});
			}

			const result = readNewsletterFile();
			if (result.error === 'missing') {
				return interaction.reply({
					content: translations.translate('NEWSLETTER_FILE_MISSING'),
					flags: 64,
				});
			}
			if (result.error === 'empty') {
				return interaction.reply({
					content: translations.translate('NEWSLETTER_FILE_EMPTY'),
					flags: 64,
				});
			}
			if (result.error === 'too_long') {
				return interaction.reply({
					content: translations.translate('NEWSLETTER_FILE_TOO_LONG', {
						length: result.length,
						limit: DISCORD_CONTENT_LIMIT,
					}),
					flags: 64,
				});
			}

			const { sent, total } = await broadcastToSubscribers(client, NEWSLETTER_TYPE, { content: result.content });

			if (total === 0) {
				return interaction.reply({
					content: translations.translate('NEWSLETTER_PUBLISH_EMPTY'),
					flags: 64,
				});
			}

			return interaction.reply({
				content: translations.translate('NEWSLETTER_PUBLISH_SUCCESS', { sent, total }),
				flags: 64,
			});
		}

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
