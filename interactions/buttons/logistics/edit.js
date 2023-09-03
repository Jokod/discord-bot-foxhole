const { Material } = require('../../../data/models.js');
const ResponseMaterial = require('../../../utils/interaction/response_material.js');

module.exports = {
	id: 'button_logistics_edit',

	async execute(interaction) {
		const materialId = interaction.customId.split('-')[3];

		try {
			await Material.update({ status: 'pending' }, { where: { material_id: materialId } });

			const material = await Material.findOne({ where: { material_id: materialId } });

			await new ResponseMaterial(interaction, material).response();
		}
		catch (err) {
			console.error(err);
			return await interaction.reply({
				content: 'Une erreur s\'est produite lors de l\'annulation de l\'opération !',
				ephemeral: true,
			});
		}
	},
};
