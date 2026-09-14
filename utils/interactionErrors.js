const {
	isMissingAccessError,
	isExpiredInteractionError,
	getDiscordErrorCode,
	missingChannelAccessText,
} = require('./discordAccess.js');
const { v2Text, editReplyV2, followUpV2, replyV2 } = require('./componentsV2.js');

/**
 * Log + ephemeral reply/followUp for a failed interaction command.
 * @param {import('discord.js').Interaction} interaction
 * @param {{ translate: (key: string, params?: object) => string }} translations
 * @param {unknown} err
 */
async function handleInteractionError(interaction, translations, err) {
	const missingAccess = isMissingAccessError(err);
	const expired = isExpiredInteractionError(err);

	if (missingAccess) {
		const channelId = interaction.channelId ?? interaction.channel?.id ?? '?';
		const code = getDiscordErrorCode(err);
		console.warn(`[Interaction] Channel access/permissions denied on channel ${channelId} (code ${code})`);
	}
	else if (expired) {
		const code = getDiscordErrorCode(err);
		console.warn(`[Interaction] Interaction expired or already acknowledged (code ${code}) — skipping reply`);
		return;
	}
	else {
		console.error(err);
	}

	const content = missingAccess
		? missingChannelAccessText(translations)
		: translations.translate('COMMAND_EXECUTE_ERROR');
	const payload = v2Text(content, { ephemeral: true });

	try {
		// Ephemeral can only be set on the initial reply or a followUp — not on editReply.
		if (interaction.deferred && !interaction.replied) {
			await editReplyV2(interaction, v2Text(content));
		}
		else if (interaction.replied || interaction.deferred) {
			await followUpV2(interaction, payload);
		}
		else {
			await replyV2(interaction, payload);
		}
	}
	catch (replyErr) {
		if (isExpiredInteractionError(replyErr)) {
			console.warn('[Interaction] Cannot reply — interaction expired (10062/40060)');
			return;
		}
		console.error('Failed to send error message to interaction:', replyErr);
	}
}

module.exports = {
	handleInteractionError,
};
