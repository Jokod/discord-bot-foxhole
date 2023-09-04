const { SlashCommandBuilder } = require('discord.js');
const { Material } = require('../../../data/models.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('revoke_task')
		.setDescription('Révoquer une tâche logistique')
		.addStringOption((option) =>
			option
				.setName('id')
				.setDescription('Identifiant de la tâche')
				.setRequired(true),
		)
		.setDMPermission(false),

	async execute(interaction) {
		const id = interaction.options.getString('id');

		const material = await Material.findOne({ material_id: `${id}` });

		if (!material) {
			return interaction.reply({
				content: 'La tâche n\'existe pas !',
				ephemeral: true,
			});
		}

		try {
			await Material.updateOne({ material_id: `${id}` }, { owner_id: null });

			await interaction.reply({
				content: `La tâche n'est plus assigné à <@${material.owner_id}> !`,
				components: [],
				ephemeral: true,
			});
		}
		catch (error) {
			console.log(error);
			return interaction.reply({
				content: 'Une erreur est survenue lors de la révocation de la tâche !',
				ephemeral: true,
			});
		}
	},
};
