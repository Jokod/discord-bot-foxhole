const { Material } = require('../../../data/models.js');
const ResponseMaterial = require('../../../utils/interaction/response_material.js');

module.exports = {
	id: 'button_logistics_edit',

	async execute(interaction) {
		const materialId = interaction.customId.split('-')[3];

		try {
			await Material.updateOne({ material_id: `${materialId}` }, { status: 'pending' });

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
