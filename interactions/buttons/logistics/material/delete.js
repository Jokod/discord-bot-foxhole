const { Material } = require('../../../../data/models.js');
const Translate = require('../../../../utils/translations.js');

module.exports = {
	id: 'button_logistics_material_delete',

	async execute(interaction) {
		const materialId = interaction.customId.split('-')[1];
		const translations = new Translate(interaction.client, interaction.guild.id);

		try {
			const rowCount = await Material.deleteOne({ material_id: `${materialId}` });

			if (rowCount.deletedCount === 0) {
				return await interaction.reply({
					content: translations.translate('MATERIAL_NOT_EXIST'),
					ephemeral: true,
				});
			}

			await interaction.update({
				content: translations.translate('MATERIAL_DELETE_SUCCESS'),
				components: [],
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
