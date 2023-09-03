const { Operation, Group, Material } = require('../../../data/models.js');

module.exports = {
	id: 'button_create_operation_cancel',

	async execute(interaction) {
		const operationId = interaction.customId.split('-')[1];
		const operation = await Operation.findOne({ where: { operation_id: operationId } });

		try {
			const threads = await Group.findAll({ where: { operation_id: operationId } });
			for (const thread of threads) {
				const result = interaction.channel.threads.cache.find(t => t.id === thread.threadId);
				if (result) await result.delete();
			}

			await Operation.destroy({ where: { operation_id: operationId } });
			await Group.destroy({ where: { operation_id: operationId } });
			await Material.destroy({ where: { operation_id: operationId } });

			await interaction.update({
				content: `Opération **${operation.get('title')}** annulée !`,
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
