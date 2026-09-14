const { Operation } = require('../../../data/models.js');
const Translate = require('../../../utils/translations.js');
const { safeEscapeMarkdown } = require('../../../utils/markdown.js');
const { deleteBoardsByOperation } = require('../../../services/order/index.js');
const { v2Text } = require('../../../utils/componentsV2.js');
const { buildOperationMessagePayload } = require('../../../utils/operationMessage.js');

module.exports = {
	id: 'button_create_operation_finished',

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

			await deleteBoardsByOperation(guild.id, operationId, client);
			await Operation.updateOne({ guild_id: guild.id, operation_id: `${operationId}` }, { status: 'finished' });

			await interaction.update(buildOperationMessagePayload(
				'finished',
				operation,
				translations,
				translations.translate('OPERATION_FINISHED_SUCCESS', { title: safeEscapeMarkdown(operation.title) }),
				[],
			));
		}
		catch (err) {
			console.error(err);
			return await interaction.reply(v2Text(translations.translate('OPERATION_FINISHED_ERROR'), { ephemeral: true }));
		}
	},
};
