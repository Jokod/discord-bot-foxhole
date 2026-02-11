const { NotificationSubscription } = require('../data/models.js');
const Translate = require('./translations.js');

/**
 * Get all channel subscriptions for a guild and notification type.
 * @param {string} guildId
 * @param {string} notificationType
 * @returns {Promise<Array<{ channel_id: string }>>}
 */
async function getSubscriptions(guildId, notificationType) {
	const list = await NotificationSubscription.find({
		guild_id: guildId,
		notification_type: notificationType,
	}).lean();
	return list.map((s) => ({ channel_id: s.channel_id }));
}

/**
 * Send a message to all channels subscribed to a notification type in a guild.
 * buildPayload(translations) returns { content?, embeds? } in the guild language.
 * Swallows errors for individual channels (e.g. missing channel, no permission).
 * @param {import('discord.js').Client} client
 * @param {string} guildId
 * @param {string} notificationType
 * @param {(translations: import('./translations.js')) => { content?: string, embeds?: import('discord.js').EmbedBuilder[] }} buildPayload
 */
async function sendToSubscribers(client, guildId, notificationType, buildPayload) {
	const subscriptions = await getSubscriptions(guildId, notificationType);
	if (subscriptions.length === 0) return;

	const translations = new Translate(client, guildId);
	const payload = buildPayload(translations);

	for (const { channel_id } of subscriptions) {
		try {
			const channel = await client.channels.fetch(channel_id).catch(() => null);
			if (channel && channel.isSendable()) {
				await channel.send(payload);
			}
		}
		catch {
			// Channel deleted, no permission, etc. — skip
		}
	}
}

module.exports = { getSubscriptions, sendToSubscribers };
