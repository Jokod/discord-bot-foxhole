const { prefix } = require('./../../config.json');
const { EmbedBuilder, ChannelType } = require('discord.js');

module.exports = {
	name: 'help',
	description: 'Liste de toutes les commandes ou informations sur une commande spécifique.',
	aliases: ['commands'],
	usage: '[command name]',
	cooldown: 5,

	execute(message, args) {
		const { commands } = message.client;

		// If there are no args, it means it needs whole help command.

		if (!args.length) {
			/**
			 * @type {EmbedBuilder}
			 * @description Help command embed object
			 */

			const helpEmbed = new EmbedBuilder()
				.setColor('Random')
				.setTitle('Liste des commandes')
				.setDescription(
					'`' + commands.map((command) => command.name).join('`, `') + '`',
				)

				.addFields([
					{
						name: 'Usage',
						value: `\nVous pouvez envoyer \`${prefix}help [command name]\` pour obtenir des informations sur une commande spécifique !`,
					},
				]);

			// Attempts to send embed in DMs.

			return message.author
				.send({ embeds: [helpEmbed] })

				.then(() => {
					if (message.channel.type === ChannelType.DM) return;

					// On validation, reply back.

					message.reply({
						content: 'Je vous ai envoyé un DM avec toutes mes commandes !',
						ephermal: true,
					});
				})
				.catch((error) => {
					// On failing, throw error.

					console.error(
						`Je n'ai pas pu envoyer de DM à ${message.author.tag}.\n`,
						error,
					);

					message.reply({
						content: 'Il semble que je ne puisse pas DM vous !',
						ephermal: true,
					});
				});
		}

		// If argument is provided, check if it's a command.

		/**
		 * @type {String}
		 * @description First argument in lower case
		 */

		const name = args[0].toLowerCase();

		const command =
			commands.get(name) ||
			commands.find((c) => c.aliases && c.aliases.includes(name));

		// If it's an invalid command.

		if (!command) {
			return message.reply({
				content: 'Ce n\'est pas une commande valide !',
				ephermal: true,
			});
		}

		/**
		 * @type {EmbedBuilder}
		 * @description Embed of Help command for a specific command.
		 */

		const commandEmbed = new EmbedBuilder()
			.setColor('Random')
			.setTitle('Commande d\'aide');

		if (command.description) {commandEmbed.setDescription(`${command.description}`);}

		if (command.aliases) {
			commandEmbed.addFields([
				{
					name: 'Aliases',
					value: `\`${command.aliases.join(', ')}\``,
					inline: true,
				},
				{
					name: 'Cooldown',
					value: `${command.cooldown || 3} seconde(s)`,
					inline: true,
				},
			]);
		}
		if (command.usage) {
			commandEmbed.addFields([
				{
					name: 'Usage',
					value: `\`${prefix}${command.name} ${command.usage}\``,
					inline: true,
				},
			]);
		}

		// Finally send the embed.

		message.channel.send({ embeds: [commandEmbed] });
	},
};
