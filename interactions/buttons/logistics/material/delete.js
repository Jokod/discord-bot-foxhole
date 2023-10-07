const { Material } = require('../../../../data/models.js');

module.exports = {
	id: 'button_logistics_material_delete',

	async execute(interaction) {
		const materialId = interaction.customId.split('-')[3];

		try {
			const rowCount = await Material.deleteOne({ material_id: `${materialId}` });

			if (!rowCount) {
				return await interaction.reply({
					content: 'This material does not exist !',
					ephemeral: true,
				});
			}

			await interaction.update({
				content: 'The material has been deleted !',
				components: [],
			});
		}
		catch (err) {
			console.error(err);
			return await interaction.reply({
				content: 'An error occured while deleting the material.',
				ephemeral: true,
			});
		}
	},
};
