const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { Material } = require('../../../../../data/models.js');

module.exports = {
	id: 'button_logistics_add_confirm',

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
			await Material.updateOne({ material_id: `${materialId}` }, { status: 'confirmed' });

			const material = await Material.findOne({ material_id: `${materialId}` });

			if (!material.name || !material.quantityAsk) {
				return await interaction.reply({
					content: 'This material has no name or quantity !',
					ephemeral: true,
				});
			}

			const name = material.name.charAt(0).toUpperCase() + material.name.slice(1);

			await interaction.update({
				content: `**ID:** ${materialId}\n**Matériel:** ${name}\n**Quantité:** ${material.quantityAsk}**\nResponsable:** Aucun`,
				components: [actionRow],
			});
		}
		catch (err) {
			console.error(err);
			return await interaction.reply({
				content: 'An error occured while confirming the material.',
				ephemeral: true,
			});
		}
	},
};
