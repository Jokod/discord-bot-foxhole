const { Material } = require("../../../data/models.js");
const ResponseMaterial = require("../../../utils/interaction/response_material.js");

module.exports = {
	id: "modal_logistics_add_quantity_ask",

	async execute(interaction) {
        const materialId = interaction.customId.split('-')[3];

		const quantity_ask = interaction.fields.getTextInputValue('quantity_ask');

        try {
            await Material.update({ quantityAsk: quantity_ask }, { where: { material_id: materialId } });

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
