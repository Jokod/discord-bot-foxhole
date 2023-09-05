const { ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
const { Material } = require('../../../data/models.js');

module.exports = {
	id: 'modal_logistics_material_validate',

	async execute(interaction) {
		const materialId = interaction.customId.split('-')[1];
		const localization = interaction.fields.getTextInputValue('localization');
		const quantityGiven = interaction.fields.getTextInputValue('quantity_given');

		const removeButton = new ButtonBuilder()
			.setCustomId(`button_logistics_material_delete-${materialId}`)
			.setLabel('Supprimer')
			.setStyle(ButtonStyle.Danger);

		const actionRow = new ActionRowBuilder().addComponents(removeButton);

		try {
			const material = await Material.findOneAndUpdate(
				{ material_id: `${materialId}` },
				{
					localization,
					quantityGiven,
				}, { new: true });

			if (!material) {
				return await interaction.reply({
					content: 'Le matériel n\'a pas été trouvé !',
					ephemeral: true,
				});
			}

			await interaction.update({
				content: `**ID:** ${materialId}\n**Matériel:** ${material.name}\n**Quantité:** ${material.quantityAsk}**\nResponsable:** <@${interaction.user.id}>\n\n**Lieu de stockage:** ${localization}\n**Quantité donnée:** ${quantityGiven}`,
				components: [actionRow],
			});
		}
		catch (err) {
			console.error(err);
			return await interaction.reply({
				content: 'Une erreur s\'est produite lors de la validation du matériel !',
				ephemeral: true,
			});
		}
	},
};
