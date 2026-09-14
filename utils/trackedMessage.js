/**
 * Utilitaires pour retrouver ou sauvegarder un message Discord dont on garde la référence.
 * Utilisé pour éditer un message existant plutôt que d'en poster un nouveau.
 *
 * @param {import('discord.js').TextChannel} channel
 * @param {string} serverId
 * @param {string} messageType - Clé unique (ex. 'stockpile_list', 'order_board:<id>')
 * @param {Object} options
 * @param {import('mongoose').Model} options.model - Modèle TrackedMessage
 * @param {Function} [options.fallbackMatcher] - (messages: Collection) => Message | null - Pour migrer ou retrouver si le message a été supprimé de la base
 * @returns {Promise<import('discord.js').Message | null>}
 */
async function findTrackedMessage(channel, serverId, messageType, { model, fallbackMatcher }) {
	if (!channel?.isTextBased?.()) return null;
	if (!model) return null;

	const stored = await model.findOne({
		server_id: serverId,
		channel_id: channel.id,
		message_type: messageType,
	});

	if (stored?.message_id) {
		try {
			const msg = await channel.messages.fetch(stored.message_id);
			if (msg) return msg;
		}
		catch {
			await model.deleteOne({ _id: stored._id }).catch(() => undefined);
		}
	}

	if (fallbackMatcher) {
		const messages = await channel.messages.fetch({ limit: 100 }).catch(() => null);
		if (!messages) return null;

		const found = fallbackMatcher(messages);
		if (found) {
			await model.findOneAndUpdate(
				{ server_id: serverId, channel_id: channel.id, message_type: messageType },
				{ server_id: serverId, channel_id: channel.id, message_type: messageType, message_id: found.id },
				{ upsert: true },
			).catch(() => undefined);
			return found;
		}
	}

	return null;
}

/**
 * Sauvegarde l'ID d'un message après envoi.
 */
async function saveTrackedMessage(serverId, channelId, messageId, messageType, model) {
	if (!serverId || !channelId || !messageId || !messageType || !model) return;
	await model.findOneAndUpdate(
		{ server_id: serverId, channel_id: channelId, message_type: messageType },
		{ server_id: serverId, channel_id: channelId, message_type: messageType, message_id: messageId },
		{ upsert: true },
	).catch(() => undefined);
}

/**
 * Édite le message tracked (cutover V2 via delete+repost si legacy), ou fallbackSend si absent.
 *
 * @param {Object} options
 * @param {import('discord.js').TextChannel} options.channel
 * @param {string} options.serverId
 * @param {string} options.messageType
 * @param {import('mongoose').Model} options.model
 * @param {Function} [options.fallbackMatcher]
 * @param {Object} options.editPayload - Components V2 payload
 * @param {Function} options.fallbackSend - async () => Message | undefined
 * @returns {Promise<{ usedFallback: boolean, message?: import('discord.js').Message|null, reposted?: boolean }>}
 */
async function editTrackedOrFallback({
	channel,
	serverId,
	messageType,
	model,
	fallbackMatcher,
	editPayload,
	fallbackSend,
}) {
	const { editOrRepostV2 } = require('./componentsV2.js');
	const { withAsyncLock, trackedLockKey } = require('./asyncLock.js');

	return withAsyncLock(trackedLockKey(serverId, messageType), async () => {
		const message = await findTrackedMessage(channel, serverId, messageType, { model, fallbackMatcher });
		if (message) {
			const { message: result, reposted } = await editOrRepostV2(message, channel, editPayload);
			if (reposted) {
				await saveTrackedMessage(serverId, channel?.id, result.id, messageType, model);
			}
			return { usedFallback: reposted, message: result, reposted };
		}

		const sent = await fallbackSend();
		if (sent?.id) {
			await saveTrackedMessage(serverId, channel?.id, sent.id, messageType, model);
		}
		return { usedFallback: true, message: sent || null, reposted: false };
	});
}

module.exports = { findTrackedMessage, saveTrackedMessage, editTrackedOrFallback };
