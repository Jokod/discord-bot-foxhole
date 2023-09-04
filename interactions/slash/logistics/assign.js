const { SlashCommandBuilder } = require('discord.js');
const { Material } = require('../../../data/models.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('assign_task')
		.setDescription('Assigner une tâche logistique à un membre')
		.addStringOption((option) =>
			option
				.setName('id')
				.setDescription('Identifiant de la tâche')
				.setRequired(true),
		)
		.addUserOption((option) =>
			option
				.setName('user')
				.setDescription('Membre à assigner')
				.setRequired(true),
		),

	async execute(interaction) {
		const id = interaction.options.getString('id');
		const user = interaction.options.getUser('user');

		try {
			const material = await Material.findOne({ material_id: `${id}` });

			if (material.owner_id !== null) {
				return interaction.reply({
					content: 'La tâche est déjà assigné à un membre !',
					ephemeral: true,
				});
			}

			await Material.updateOne({ material_id: `${id}` }, { owner_id: user });

			await interaction.reply({
				content: `La tâche est maintenant assigné à <@${user}> !`,
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
