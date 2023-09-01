module.exports = {
	async execute(interaction) {
		await interaction.reply({
			content: "Aucune intéraction n'a été trouvée pour cette action.",
			ephemeral: true,
		});
		return;
	},
};
