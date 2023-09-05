const { Material } = require('../../../../data/models.js');

module.exports = {
	id: 'button_logistics_material_delete',

	async execute(interaction) {
		const materialId = interaction.customId.split('-')[3];

		try {
			const rowCount = await Material.deleteOne({ material_id: `${materialId}` });

			if (!rowCount) {
				return await interaction.reply({
					content: 'Ce matériel n\'existe pas !',
					ephemeral: true,
				});
			}

			await interaction.update({
				content: 'Le matériel a été supprimé avec succès.',
				components: [],
			});
		}
		catch (err) {
			console.error(err);
			return await interaction.reply({
				content: 'Une erreur s\'est produite lors de la suppression du matériel !',
				ephemeral: true,
			});
		}
	},
};
