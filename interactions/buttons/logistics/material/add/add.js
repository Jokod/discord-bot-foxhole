const { ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
const { Operation, Material } = require('../../../../../data/models.js');

module.exports = {
	id: 'button_logistics_add',

	async execute(interaction) {
		const operationId = interaction.customId.split('-')[1];
		const threadId = interaction.customId.split('-')[2];
		const operation = await Operation.findOne({ operation_id: `${operationId}` });

		const materialButton = new ButtonBuilder()
			.setCustomId(`button_logistics_add_material-${operationId}-${threadId}-${interaction.id}`)
			.setLabel('Material')
			.setStyle(ButtonStyle.Primary);

		const quantityAskButton = new ButtonBuilder()
			.setCustomId(`button_logistics_add_quantity_ask-${operationId}-${threadId}-${interaction.id}`)
			.setLabel('Quantity')
			.setStyle(ButtonStyle.Secondary);

		const confirmButton = new ButtonBuilder()
			.setCustomId(`button_logistics_add_confirm-${operationId}-${threadId}-${interaction.id}`)
			.setLabel('Confirm')
			.setStyle(ButtonStyle.Success);

		const deleteButton = new ButtonBuilder()
			.setCustomId(`button_logistics_material_delete-${interaction.id}`)
			.setLabel('Delete')
			.setStyle(ButtonStyle.Danger);

		const ActionRow = new ActionRowBuilder().addComponents(materialButton, quantityAskButton, confirmButton, deleteButton);

		try {
			await Material.create({
				material_id: interaction.id,
				operation_id: operationId,
				group_id: threadId,
				status: 'pending',
			});

			await interaction.reply({
				content: `**ID:** ${interaction.id}\nAjout d'un matériel à l'opération **${operation.title}**`,
				components: [ActionRow],
			});
		}
		catch (err) {
			console.error(err);
			return await interaction.reply({
				content: 'An error occured while creating the material.',
				ephemeral: true,
			});
		}
	},
};
