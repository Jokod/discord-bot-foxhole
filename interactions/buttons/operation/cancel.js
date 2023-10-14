const { Operation, Group, Material } = require('../../../data/models.js');
const Translate = require('../../../utils/translations.js');

module.exports = {
	id: 'button_create_operation_cancel',

	async execute(interaction) {
		const operationId = interaction.customId.split('-')[1];
		const translations = new Translate(interaction.client, interaction.guild.id);


		try {
			const operation = await Operation.findOne({ operation_id: `${operationId}` });

			if (interaction.user.id !== operation.owner_id) {
				return await interaction.reply({
					content: translations.translate('OPERATION_ARE_NO_OWNER_ERROR'),
					ephemeral: true,
				});
			}

			const threads = await Group.find({ operation_id: `${operationId}` });
			for (const thread of threads) {
				const result = interaction.channel.threads.cache.find(t => t.id === thread.threadId);
				if (result) await result.delete();
			}

			await Operation.deleteOne({ operation_id: `${operationId}` });
			await Group.deleteOne({ operation_id: `${operationId}` });
			await Material.deleteOne({ operation_id: `${operationId}` });

			await interaction.update({
				content: translations.translate('OPERATION_CANCELED_SUCCESS', { title: operation.title }),
				components: [],
			});
		}
		catch (err) {
			console.error(err);
			return await interaction.reply({
				content: translations.translate('OPERATION_CANCELED_ERROR'),
				ephemeral: true,
			});
		}
	},
};
