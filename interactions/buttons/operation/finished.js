const { Operation } = require('../../../data/models.js');
const Translate = require('../../../utils/translations.js');
const { safeEscapeMarkdown } = require('../../../utils/markdown.js');
const { deleteBoardsByOperation } = require('../../../services/order/index.js');

module.exports = {
	id: 'button_create_operation_finished',

	async execute(interaction) {
		const { client, guild, message, user } = interaction;
		const operationId = message.id;
		const translations = new Translate(client, guild.id);

		try {
			const operation = await Operation.findOne({ guild_id: guild.id, operation_id: `${operationId}` });

			if (!operation) {
				return await interaction.reply({
					content: translations.translate('OPERATION_NOT_EXIST'),
					flags: 64,
				});
			}

			if (user.id !== operation.owner_id) {
				return await interaction.reply({
					content: translations.translate('OPERATION_ARE_NO_OWNER_ERROR'),
					flags: 64,
				});
			}

			const content = `**${translations.translate('OPERATION_CREATOR')}:** <@${operation.owner_id}>\n**${translations.translate('DATE')}:** ${operation.date}\n**${translations.translate('HOURS')}:** ${operation.time}\n**${translations.translate('DURATION')}:** ${operation.duration} min\n**${translations.translate('DESCRIPTION')}:** ${safeEscapeMarkdown(
				operation.description,
			)}`;

			await deleteBoardsByOperation(guild.id, operationId, client);
			await Operation.updateOne({ guild_id: guild.id, operation_id: `${operationId}` }, { status: 'finished' });

			await interaction.update({
				content: `${translations.translate('OPERATION_FINISHED_SUCCESS', { title: safeEscapeMarkdown(operation.title) })}\n${content}`,
				components: [],
			});
		}
		catch (err) {
			console.error(err);
			return await interaction.reply({
				content: translations.translate('OPERATION_FINISHED_ERROR'),
				flags: 64,
			});
		}
	},
};
