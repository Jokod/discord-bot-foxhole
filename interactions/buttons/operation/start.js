const { ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
const { Operation } = require('../../../data/models.js');
const Translate = require('../../../utils/translations.js');
const { safeEscapeMarkdown } = require('../../../utils/markdown.js');
const { v2Text } = require('../../../utils/componentsV2.js');
const { buildOperationMessagePayload } = require('../../../utils/operationMessage.js');

module.exports = {
	id: 'button_create_operation_start',

	async execute(interaction) {
		const { client, guild, message, user } = interaction;
		const operationId = message.id;
		const translations = new Translate(client, guild.id);

		try {
			const operation = await Operation.findOne({ guild_id: guild.id, operation_id: `${operationId}` });

			if (!operation) {
				return await interaction.reply(v2Text(translations.translate('OPERATION_NOT_EXIST'), { ephemeral: true }));
			}

			if (user.id !== operation.owner_id) {
				return await interaction.reply(v2Text(translations.translate('OPERATION_ARE_NO_OWNER_ERROR'), { ephemeral: true }));
			}

			const finishedButton = new ButtonBuilder()
				.setCustomId('button_create_operation_finished')
				.setLabel(translations.translate('FINISHED'))
				.setStyle(ButtonStyle.Success);

			const cancelButton = new ButtonBuilder()
				.setCustomId('button_create_operation_cancel')
				.setLabel(translations.translate('CANCEL'))
				.setStyle(ButtonStyle.Danger);

			const ActionRow = new ActionRowBuilder().addComponents(finishedButton, cancelButton);

			await Operation.updateOne({ guild_id: guild.id, operation_id: `${operationId}` }, { status: 'started' });

			await interaction.update(buildOperationMessagePayload(
				'started',
				operation,
				translations,
				translations.translate('OPERATION_LAUNCH_SUCCESS', { title: safeEscapeMarkdown(operation.title) }),
				[ActionRow],
			));
		}
		catch (err) {
			console.error(err);
			return await interaction.reply(v2Text(translations.translate('OPERATION_LAUNCH_ERROR'), { ephemeral: true }));
		}
	},
};
