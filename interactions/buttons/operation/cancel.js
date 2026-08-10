const { Operation } = require('../../../data/models.js');
const Translate = require('../../../utils/translations.js');
const { safeEscapeMarkdown } = require('../../../utils/markdown.js');
const { deleteBoardsByOperation } = require('../../../services/order/index.js');

module.exports = {
	id: 'button_create_operation_cancel',

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

			await interaction.deferReply({ flags: 64 });

			await deleteBoardsByOperation(guild.id, operationId, client);
			await Operation.deleteOne({ guild_id: guild.id, operation_id: `${operationId}` });
			await message.delete().catch(console.error);

			await interaction.editReply({
				content: translations.translate('OPERATION_CANCELED_SUCCESS', { title: safeEscapeMarkdown(operation.title) }),
			});
		}
		catch (err) {
			console.error(err);
			if (!interaction.replied && !interaction.deferred) {
				return await interaction.reply({
					content: translations.translate('OPERATION_CANCELED_ERROR'),
					flags: 64,
				});
			}
			return await interaction.editReply({
				content: translations.translate('OPERATION_CANCELED_ERROR'),
			});
		}
	},
};
