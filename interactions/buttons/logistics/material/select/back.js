const ResponseMaterial = require('../../../../../utils/interaction/response_material.js');
const { Material } = require('../../../../../data/models.js');
const Translate = require('../../../../../utils/translations.js');

module.exports = {
	id: 'logistics_select_material_back',

	async execute(interaction) {
		const materialId = interaction.customId.split('-')[3];
		const translations = new Translate(interaction.client, interaction.guild.id);

		try {
			const material = await Material.findOne({ material_id: `${materialId}` });

			if (interaction.user.id !== material.owner_id) {
				return await interaction.reply({
					content: translations.translate('MATERIAL_ARE_NO_CREATOR_ERROR'),
					ephemeral: true,
				});
			}

			await new ResponseMaterial(interaction, material).response();
		}
		catch (error) {
			console.error(error);
			return await interaction.reply({
				content: translations.translate('MATERIAL_BACK_ERROR'),
				ephemeral: true,
			});
		}
	},
};
