const { isMissingAccessError, getDiscordErrorCode } = require('./discordAccess.js');

/**
 * Log + ephemeral reply/followUp for a failed interaction command.
 * @param {import('discord.js').Interaction} interaction
 * @param {{ translate: (key: string, params?: object) => string }} translations
 * @param {unknown} err
 */
async function handleInteractionError(interaction, translations, err) {
	const missingAccess = isMissingAccessError(err);
	if (missingAccess) {
		const channelId = interaction.channelId ?? interaction.channel?.id ?? '?';
		const code = getDiscordErrorCode(err);
		console.warn(`[Interaction] Accès/permissions refusés sur le canal ${channelId} (code ${code})`);
	}
	else {
		console.error(err);
	}

	const content = translations.translate(
		missingAccess ? 'BOT_MISSING_CHANNEL_ACCESS' : 'COMMAND_EXECUTE_ERROR',
	);

	try {
		// Ephemeral can only be set on the initial reply or a followUp — not on editReply.
		if (interaction.deferred && !interaction.replied) {
			await interaction.editReply({ content });
		}
		else if (interaction.replied || interaction.deferred) {
			await interaction.followUp({ content, flags: 64 });
		}
		else {
			await interaction.reply({ content, flags: 64 });
		}
	}
	catch (replyErr) {
		console.error('Failed to send error message to interaction:', replyErr);
	}
}

module.exports = {
	handleInteractionError,
};
