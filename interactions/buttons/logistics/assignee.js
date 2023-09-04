const { ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
const { Material } = require('../../../data/models.js');

module.exports = {
	id: 'button_logistics_assignee',

	async execute(interaction) {
		const operationId = interaction.customId.split('-')[1];
		const threadId = interaction.customId.split('-')[2];
		const materialId = interaction.customId.split('-')[3];

		const revokeButton = new ButtonBuilder()
			.setCustomId(`button_logistics_revoke-${operationId}-${threadId}-${materialId}`)
			.setLabel('Révoquer')
			.setStyle(ButtonStyle.Danger);

		const validateButton = new ButtonBuilder()
			.setCustomId(`button_logistics_validate-${operationId}-${threadId}-${materialId}`)
			.setLabel('Valider')
			.setStyle(ButtonStyle.Success);

		const actionRow = new ActionRowBuilder().addComponents(revokeButton, validateButton);

		try {
			await Material.updateOne({ material_id: `${materialId}` }, { owner_id: interaction.user.id });

			const material = await Material.findOne({ material_id: `${materialId}` });

			const name = material.name.charAt(0).toUpperCase() + material.name.slice(1);

			await interaction.update({
				content: `**ID:** ${materialId}\n**Matériel:** ${name}\n**Quantité:** ${material.quantityAsk}**\nResponsable:** <@${interaction.user.id}>`,
				components: [actionRow],
			});
		}
		catch (err) {
			console.error(err);
			return await interaction.update({
				content: 'Une erreur s\'est produite lors de l\'assignation du matériel !',
				ephemeral: true,
			});
		}
	},
};
