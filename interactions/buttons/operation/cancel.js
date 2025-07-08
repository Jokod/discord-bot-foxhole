const { Operation, Group, Material } = require('../../../data/models.js');
const Translate = require('../../../utils/translations.js');

module.exports = {
	id: 'button_create_operation_cancel',

	async execute(interaction) {
		const { client, guild, message, user, channel } = interaction;
		const operationId = message.id;
		const translations = new Translate(client, guild.id);

		try {
			const operation = await Operation.findOne({ guild_id: guild.id, operation_id: `${operationId}` });

			if (!operation) {
				return await interaction.reply({
					content: translations.translate('OPERATION_NOT_EXIST'),
					ephemeral: true,
				});
			}

			if (user.id !== operation.owner_id) {
				return await interaction.reply({
					content: translations.translate('OPERATION_ARE_NO_OWNER_ERROR'),
					ephemeral: true,
				});
			}

			// Defer the reply to prevent interaction timeout
			await interaction.deferReply({ ephemeral: true });

			const threads = await Group.find({ guild_id: guild.id, operation_id: `${operationId}` });
			for (const thread of threads) {
				const result = channel.threads.cache.find(t => t.id === thread.threadId);

				if (result) {
					await Material.deleteMany({ guild_id: guild.id, group_id: `${thread.threadId}` });
					await channel.messages.fetch(result.id).then(msg => msg.delete()).catch(console.error);
					await result.delete().catch(console.error);
					await thread.deleteOne({ threadId: `${result.id}` });
				}
			}

			await Operation.deleteOne({ guild_id: guild.id, operation_id: `${operationId}` });

			await message.delete().catch(console.error);

			await interaction.editReply({
				content: translations.translate('OPERATION_CANCELED_SUCCESS', { title: operation.title }),
			});
		}
		catch (err) {
			console.error(err);
			if (!interaction.replied && !interaction.deferred) {
				return await interaction.reply({
					content: translations.translate('OPERATION_CANCELED_ERROR'),
					ephemeral: true,
				});
			} else {
				return await interaction.editReply({
					content: translations.translate('OPERATION_CANCELED_ERROR'),
				});
			}
		}
	},
};
