const {  ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const { Material } = require("../../../data/models.js");

module.exports = {
	id: "button_logistics_add_confirm",

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
            await Material.update({ status: 'confirmed' }, { where: { material_id: materialId } });

            const material = await Material.findOne({ where: { material_id: materialId } });

            if (!material.name || !material.quantityAsk) {
                return await interaction.reply({
                    content: `Le matériel n'a pas été correctement configuré !`,
                    ephemeral: true,
                });
            }

            const name = material.name.charAt(0).toUpperCase() + material.name.slice(1);

            await interaction.update({
                content: `**ID:** ${materialId}\n**Matériel:** ${name}\n**Quantité:** ${material.get('quantityAsk')}**\nResponsable:** Aucun`,
                components: [actionRow],
            });
        } catch (err) {
            console.error(err);
            return await interaction.update({
                content: "Une erreur s'est produite lors de la suppression du matériel !",
                ephemeral: true,
            });
        }
	},
};
