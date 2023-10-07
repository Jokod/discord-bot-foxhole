const { Material } = require('../../../data/models.js');

module.exports = {
	id: 'modal_logistics_remove',

	async execute(interaction) {
		const operationId = interaction.customId.split('-')[1];
		const materialId = interaction.fields.getTextInputValue('material_id');

		try {
			const material = await Material.findOne({ material_id: `${materialId}` });

			if (!material) {
				return await interaction.reply({
					content: 'This material does not exist !',
					ephemeral: true,
				});
			}

			if (material.operation_id !== operationId) {
				return await interaction.reply({
					content: 'This material does not belong to this operation !',
					ephemeral: true,
				});
			}

			await Material.deleteOne({ material_id: `${materialId}` });

			await interaction.reply({
				content: 'The material has been deleted !',
				ephemeral: true,
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
