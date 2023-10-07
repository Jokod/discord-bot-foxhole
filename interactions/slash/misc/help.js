const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('help')
		.setDescription(
			'List all of my commands or info about a specific command.',
		)
		.addStringOption((option) =>
			option
				.setName('command')
				.setDescription('The command to get help for.'),
		),

	async execute(interaction) {

		let name = interaction.options.getString('command');

		const helpEmbed = new EmbedBuilder().setColor('Random');

		if (name) {
			name = name.toLowerCase();

			helpEmbed.setTitle(`Help for the command \`${name}\``);

			if (interaction.client.slashCommands.has(name)) {
				const command = interaction.client.slashCommands.get(name);

				if (command.data.description) {
					helpEmbed.setDescription(
						command.data.description + '\n\n**Parameters:**',
					);
				}
			}
			else {
				helpEmbed
					.setDescription(`The command \`${name}\` doesn't exist!`)
					.setColor('Red');
			}
		}
		else {
			// Give a list of all the commands

			helpEmbed
				.setTitle('List of commands')
				.setDescription(
					'`' +
						interaction.client.slashCommands
							.map((command) => command.data.name)
							.join('`, `') +
						'`',
				);
		}

		// Replies to the interaction!

		await interaction.reply({
			embeds: [helpEmbed],
		});
	},
};
