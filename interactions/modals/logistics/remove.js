const { Material } = require("../../../data/models.js");

module.exports = {
	id: "modal_logistics_remove",

	async execute(interaction) {
		const operationId = interaction.customId.split('-')[1];
		const materialId = interaction.fields.getTextInputValue('material_id')

        try {
			const material = await Material.findOne({ where: { material_id: materialId } });

			if (!material) return await interaction.reply({
				content: "Aucun matériel n'a été trouvé avec cet identifiant !",
				ephemeral: true,
			});

			if (material.get('operation_id') !== operationId) return await interaction.reply({
				content: "Ce matériel n'appartient pas à cette opération !",
				ephemeral: true,
			});

            await Material.destroy({ where: { material_id: materialId } });

			await interaction.reply({
				content: "Le matériel a bien été supprimé !",
				ephemeral: true,
			});
        } catch (err) {
            console.error(err);
            return await interaction.reply({
                content: "Une erreur s'est produite lors de la suppression du matériel !",
                ephemeral: true,
            });
        }
	},
};
