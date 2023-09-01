const { ButtonBuilder, ButtonStyle, ActionRowBuilder } = require("discord.js");
const { Material } = require("../../../data/models.js");

module.exports = {
	id: "button_logistics_assignee",

	async execute(interaction) {
        const operationId = interaction.customId.split('-')[1];
        const threadId = interaction.customId.split('-')[2];
		const materialId = interaction.customId.split('-')[3];

        const revokeButton = new ButtonBuilder()
            .setCustomId(`button_logistics_revoke-${operationId}-${threadId}-${materialId}`)
            .setLabel('Révoquer')
            .setStyle(ButtonStyle.Danger);

        const actionRow = new ActionRowBuilder().addComponents(revokeButton);

        try {
            await Material.update({ owner_id: interaction.user.id }, { where: { material_id: materialId } });

            const material = await Material.findOne({ where: { material_id: materialId } });

            const name = material.get('name').charAt(0).toUpperCase() + material.get('name').slice(1);

            await interaction.update({
                content: `**ID:** ${materialId}\n**Matériel:** ${name}\n**Quantité:** ${material.get('quantityAsk')}**\nResponsable:** <@${interaction.user.id}>`,
                components: [actionRow],
            });
        } catch (err) {
            console.error(err);
            return await interaction.update({
                content: "Une erreur s'est produite lors de l'assignation du matériel !",
                ephemeral: true,
            });
        }
	},
};
