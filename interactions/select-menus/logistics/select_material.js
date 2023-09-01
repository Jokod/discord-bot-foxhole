const { Material } = require("../../../data/models.js");
const ResponseMaterial = require("../../../utils/interaction/response_material.js");

module.exports = {
	id: "stringSelect_logistics_add_material",

	async execute(interaction) {
        const materialId = interaction.customId.split('-')[3];
        console.log(materialId);
        const value = interaction.values[0];

        try {
            await Material.update({ name: value }, { where: { material_id: materialId } });

            const material = await Material.findOne({ where: { material_id: materialId } });

            await new ResponseMaterial(interaction, material).response();
        } catch (err) {
            console.error(err);
            return await interaction.reply({
                content: "Une erreur s'est produite lors de la séléction du matériel !",
                ephemeral: true,
            });
        }
	},
};
