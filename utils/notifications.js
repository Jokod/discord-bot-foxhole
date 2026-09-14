const { NotificationSubscription } = require('../data/models.js');
const Translate = require('./translations.js');
const { sendV2, assertV2Payload } = require('./componentsV2.js');

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
 * buildPayload(translations) must return a Components V2 payload ({ flags, components }).
 * Swallows errors for individual channels (e.g. missing channel, no permission).
 * @param {import('discord.js').Client} client
 * @param {string} guildId
 * @param {string} notificationType
 * @param {(translations: import('./translations.js')) => { flags: number|bigint, components: object[] }} buildPayload
 */
async function sendToSubscribers(client, guildId, notificationType, buildPayload) {
	const subscriptions = await getSubscriptions(guildId, notificationType);
	if (subscriptions.length === 0) return;

	const translations = new Translate(client, guildId);
	const payload = assertV2Payload(buildPayload(translations));

	for (const { channel_id } of subscriptions) {
		try {
			const channel = await client.channels.fetch(channel_id).catch(() => null);
			if (!channel || !channel.isSendable()) continue;
			if (channel.guildId && channel.guildId !== guildId) continue;
			await sendV2(channel, payload);
		}
		catch {
			// Channel deleted, no permission, etc. — skip
		}
	}
}

module.exports = { getSubscriptions, sendToSubscribers };
