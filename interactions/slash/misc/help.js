const { EmbedBuilder, SlashCommandBuilder } = require("discord.js");

module.exports = {
	// The data needed to register slash commands to Discord.

	data: new SlashCommandBuilder()
		.setName("help")
		.setDescription(
			"Liste de toutes les commandes ou informations sur une commande spécifique."
		)
		.addStringOption((option) =>
			option
				.setName("command")
				.setDescription("Nom de la commande à obtenir")
		),

	async execute(interaction) {
		/**
		 * @type {string}
		 * @description The "command" argument
		 */
		let name = interaction.options.getString("command");

		/**
		 * @type {EmbedBuilder}
		 * @description Help command's embed
		 */
		const helpEmbed = new EmbedBuilder().setColor("Random");

		if (name) {
			name = name.toLowerCase();

			// If a single command has been asked for, send only this command's help.

			helpEmbed.setTitle(`Aide pour la commande \`${name}\``);

			if (interaction.client.slashCommands.has(name)) {
				const command = interaction.client.slashCommands.get(name);

				if (command.data.description)
					helpEmbed.setDescription(
						command.data.description + "\n\n**Parameters:**"
					);
			} else {
				helpEmbed
					.setDescription(`Aucune commande avec le nom \`${name}\` n'a été trouvée.`)
					.setColor("Red");
			}
		} else {
			// Give a list of all the commands

			helpEmbed
				.setTitle("Liste des commandes")
				.setDescription(
					"`" +
						interaction.client.slashCommands
							.map((command) => command.data.name)
							.join("`, `") +
						"`"
				);
		}

		// Replies to the interaction!

		await interaction.reply({
			embeds: [helpEmbed],
		});
	},
};
