const { Material } = require('../../../data/models.js');
const ResponseMaterial = require('../../../utils/interaction/response_material.js');
const Translate = require('../../../utils/translations.js');

module.exports = {
	id: 'button_logistics_edit',

	async execute(interaction) {
		const materialId = interaction.customId.split('-')[3];
		const translations = new Translate(interaction.client, interaction.guild.id);

		try {
			await Material.updateOne({ material_id: `${materialId}` }, { status: 'pending' });

			const material = await Material.findOne({ material_id: `${materialId}` });

			await new ResponseMaterial(interaction, material).response();
		}
		catch (err) {
			console.error(err);
			return await interaction.reply({
				content: translations.translate('MATERIAL_UPDATE_ERROR'),
				ephemeral: true,
			});
		}
	},
};
