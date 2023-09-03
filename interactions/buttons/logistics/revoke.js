const { ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
const { Material } = require('../../../data/models.js');

module.exports = {
	id: 'button_logistics_revoke',

	async execute(interaction) {
		const operationId = interaction.customId.split('-')[1];
		const threadId = interaction.customId.split('-')[2];
		const materialId = interaction.customId.split('-')[3];

		const assigneeButton = new ButtonBuilder()
			.setCustomId(`button_logistics_assignee-${operationId}-${threadId}-${materialId}`)
			.setLabel('Me l\'assigner')
			.setStyle(ButtonStyle.Primary);

		const actionRow = new ActionRowBuilder().addComponents(assigneeButton);

		try {
			const material = await Material.findOne({ where: { material_id: materialId } });

			if (interaction.user.id !== material.get('owner_id')) {
				return await interaction.reply({
					content: 'Vous n\'êtes pas le responsable de ce matériel !',
					ephemeral: true,
				});
			}

			await Material.update({ owner_id: null }, { where: { material_id: materialId } });

			const name = material.name.charAt(0).toUpperCase() + material.name.slice(1);

			await interaction.update({
				content: `**ID:** ${materialId}\n**Matériel:** ${name}\n**Quantité:** ${material.get('quantityAsk')}**\nResponsable:** Aucun`,
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
