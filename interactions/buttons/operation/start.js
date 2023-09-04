const { ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
const { Operation } = require('../../../data/models.js');

module.exports = {
	id: 'button_create_operation_start',

	async execute(interaction) {
		const operationId = interaction.customId.split('-')[1];
		const operation = await Operation.findOne({ operation_id: `${operationId}` });

		const finishedButton = new ButtonBuilder()
			.setCustomId(`button_create_operation_finished-${operationId}`)
			.setLabel('Terminé')
			.setStyle(ButtonStyle.Success);

		const cancelButton = new ButtonBuilder()
			.setCustomId(`button_create_operation_cancel-${operationId}`)
			.setLabel('Annuler')
			.setStyle(ButtonStyle.Danger);

		const ActionRow = new ActionRowBuilder().addComponents(finishedButton, cancelButton);

		const content = `**Date:** ${operation.date}\n**Heure:** ${operation.time}\n**Durée:** ${operation.duration} min\n**Description:** ${operation.description}`;

		try {
			await Operation.updateOne({ operation_id: `${operationId}` }, { status: 'started' });

			await interaction.update({
				content: `Opération **${operation.title}** lancée ! @everyone\n${content}`,
				components: [ActionRow],
			});
		}
		catch (err) {
			console.error(err);
			return await interaction.reply({
				content: 'Une erreur s\'est produite lors du lancement de l\'opération !',
				ephemeral: true,
			});
		}
	},
};
