const { Operation, Group } = require('../../../data/models.js');

module.exports = {
	id: 'button_create_operation_finished',

	async execute(interaction) {
		const operationId = interaction.customId.split('-')[1];
		const operation = await Operation.findOne({ operation_id: `${operationId}` });

		const content = `**Date:** ${operation.date}\n**Heure:** ${operation.time}\n**Durée:** ${operation.duration} min\n**Description:** ${operation.description}`;

		try {

			Group.find({ operation_id: `${operationId}` }).exec()
			.then(threads => {
				threads.forEach(async thread => {
					const result = interaction.channel.threads.cache.find(t => t.id === thread.threadId);
					await result.setLocked(true);
					await result.setArchived(true);
				});
			}).catch(err => console.error(err));
			
			await Operation.updateOne({ operation_id: `${operationId}` },{ status: 'finished' });

			await interaction.update({
				content: `Opération **${operation.title}** terminée !\n${content}`,
				components: [],
			});
		}
		catch (err) {
			console.error(err);
			return await interaction.reply({
				content: 'Une erreur s\'est produite lors de la fin de l\'opération !',
				ephemeral: true,
			});
		}
	},
};
