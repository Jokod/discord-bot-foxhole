const { Material } = require('../../../data/models.js');
const ResponseMaterial = require('../../../utils/interaction/response_material.js');

module.exports = {
	id: 'logistics_add_material',

	async execute(interaction) {
		const materialId = interaction.customId.split('-')[3];
		const value = interaction.values[0];

		try {
			await Material.updateOne({ material_id: `${materialId}` }, { name: value });

			const material = await Material.findOne({ material_id: `${materialId}` });

			await new ResponseMaterial(interaction, material).response();
		}
		catch (err) {
			console.error(err);
			return await interaction.reply({
				content: 'An error occured while updating the material.',
				ephemeral: true,
			});
		}
	},
};
