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
			.setLabel('Assignee')
			.setStyle(ButtonStyle.Primary);

		const actionRow = new ActionRowBuilder().addComponents(assigneeButton);

		try {
			const material = await Material.findOne({ material_id: `${materialId}` });

			if (interaction.user.id !== material.owner_id) {
				return await interaction.reply({
					content: 'You are not the owner of this material !',
					ephemeral: true,
				});
			}

			await Material.updateOne({ material_id: `${materialId}` }, { owner_id: null });

			const name = material.name.charAt(0).toUpperCase() + material.name.slice(1);

			await interaction.update({
				content: `**ID:** ${materialId}\n**Matériel:** ${name}\n**Quantité:** ${material.quantityAsk}**\nResponsable:** Aucun`,
				components: [actionRow],
			});
		}
		catch (err) {
			console.error(err);
			return await interaction.update({
				content: 'An error occured while assigning the material.',
				ephemeral: true,
			});
		}
	},
};
