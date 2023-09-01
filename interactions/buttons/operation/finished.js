const { Operation } = require("../../../data/models.js");

module.exports = {
	id: "button_create_operation_finished",

	async execute(interaction) {
		const operationId = interaction.customId.split('-')[1];
		const operation = await Operation.findOne({ where: { operation_id: operationId } });

		const content = `**Date:** ${operation.get('date')}\n**Heure:** ${operation.get('time')}\n**Durée:** ${operation.get('duration')}\n**Description:** ${operation.get('description')}`;

		try {
			const thread = interaction.channel.threads.cache.find(thread => thread.name === `Opération ${operation.get('title')}`);
			await thread.setLocked(true);
			await thread.setArchived(true);

			await Operation.update({
					status: 'finished',
				},
				{ where: { operation_id: operationId }
			});

			await interaction.update({
				content: `Opération **${operation.get('title')}** terminée !\n${content}`,
				components: [],
			});
		} catch (err) {
			console.error(err);
			return await interaction.reply({
				content: "Une erreur s'est produite lors de l'annulation de l'opération !",
				ephemeral: true,
			});
		}
	},
};
