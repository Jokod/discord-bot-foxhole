const { Operation, Group, Material } = require('../../../data/models.js');

module.exports = {
	id: 'button_create_operation_cancel',

	async execute(interaction) {
		const operationId = interaction.customId.split('-')[1];
		const operation = await Operation.findOne({ operation_id: `${operationId}` });

		try {
			const threads = await Group.find({ operation_id: `${operationId}` });
			for (const thread of threads) {
				const result = interaction.channel.threads.cache.find(t => t.id === thread.threadId);
				if (result) await result.delete();
			}

			await Operation.deleteOne({ operation_id: `${operationId}` });
			await Group.deleteOne({ operation_id: `${operationId}` });
			await Material.deleteOne({ operation_id: `${operationId}` });

			await interaction.update({
				content: `Opération **${operation.title}** annulée !`,
				components: [],
			});
		}
		catch (err) {
			console.error(err);
			return await interaction.reply({
				content: 'Une erreur s\'est produite lors de l\'annulation de l\'opération !',
				ephemeral: true,
			});
		}
	},
};
