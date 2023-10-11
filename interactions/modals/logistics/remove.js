const { Material } = require('../../../data/models.js');
const Translate = require('../../../utils/translations.js');

module.exports = {
	id: 'modal_logistics_remove',

	async execute(interaction) {
		const operationId = interaction.customId.split('-')[1];
		const materialId = interaction.fields.getTextInputValue('material_id');
		const translations = new Translate(interaction.client, interaction.guild.id);

		try {
			const material = await Material.findOne({ material_id: `${materialId}` });

			if (!material) {
				return await interaction.reply({
					content: translations.translate('MATERIAL_NOT_EXIST'),
					ephemeral: true,
				});
			}

			if (material.operation_id !== operationId) {
				return await interaction.reply({
					content: translations.translate('MATERIAL_NOT_BELONG_OPERATION'),
					ephemeral: true,
				});
			}

			await Material.deleteOne({ material_id: `${materialId}` });

			await interaction.reply({
				content: translations.translate('MATERIAL_DELETE_SUCCESS'),
				ephemeral: true,
			});
		}
		catch (err) {
			console.error(err);
			return await interaction.reply({
				content: translations.translate('MATERIAL_DELETE_ERROR'),
				ephemeral: true,
			});
		}
	},
};
