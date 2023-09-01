const { ButtonBuilder, ButtonStyle, ActionRowBuilder } = require("discord.js");
const { Operation } = require("../../../data/models.js");

module.exports = {
	id: "button_create_operation_start",

	async execute(interaction) {
        const operationId = interaction.customId.split('-')[1];
        const operation = await Operation.findOne({ where: { operation_id: operationId } });

		const finishedButton = new ButtonBuilder()
			.setCustomId(`button_create_operation_finished-${operationId}`)
			.setLabel('Terminé')
			.setStyle(ButtonStyle.Success);

		const cancelButton = new ButtonBuilder()
			.setCustomId(`button_create_operation_cancel-${operationId}`)
			.setLabel('Annuler')
			.setStyle(ButtonStyle.Danger);

		const ActionRow = new ActionRowBuilder().addComponents(finishedButton, cancelButton);

		const content = `**Date:** ${operation.get('date')}\n**Heure:** ${operation.get('time')}\n**Durée:** ${operation.get('duration')}\n**Description:** ${operation.get('description')}`;

		try {
			await Operation.update({
					status: 'started',
				},
				{ where: { operation_id: operationId }
			});	
	
			await interaction.update({
				content: `Opération **${operation.get('title')}** lancée ! @everyone\n${content}`,
				components: [ActionRow],
			});
		} catch (err) {
			console.error(err);
			return await interaction.reply({
				content: "Une erreur s'est produite lors du lancement de l'opération !",
				ephemeral: true,
			});
		}
	},
};
