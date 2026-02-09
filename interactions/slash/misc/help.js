const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const { getRandomColor } = require('../../../utils/colors.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('help')
		.setNameLocalizations({
			fr: 'aide',
			ru: 'помощь',
			'zh-CN': '帮助',
		})
		.setDescription(
			'List all of my commands or info about a specific command.',
		)
		.setDescriptionLocalizations({
			fr: 'Liste toutes mes commandes ou des informations sur une commande spécifique.',
			ru: 'Список всех моих команд или информация о конкретной команде.',
			'zh-CN': '列出所有命令或有关特定命令的信息。',
		})
		.addStringOption((option) =>
			option
				.setName('command')
				.setNameLocalizations({
					fr: 'commande',
					ru: 'команда',
					'zh-CN': '命令',
				})
				.setDescription('The command to get help for.')
				.setDescriptionLocalizations({
					fr: 'La commande pour obtenir de l\'aide.',
					ru: 'Команда для получения помощи.',
					'zh-CN': '要获取帮助的命令。',
				}),
		),

	async execute(interaction) {

		let name = interaction.options.getString('command');

		const helpEmbed = new EmbedBuilder().setColor(getRandomColor());

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
					.setColor(0xFF0000);
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
			flags: 64,
		});
	},
};
