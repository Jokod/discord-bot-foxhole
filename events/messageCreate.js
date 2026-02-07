require('dotenv').config();
const { Collection, ChannelType, Events } = require('discord.js');
const { Server } = require('../data/models.js');
const Translate = require('../utils/translations.js');

const escapeRegex = (string) => {
	return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

module.exports = {
	name: Events.MessageCreate,

	/**
	 * @description Executes when a message is created and handle it.

	 * @param {import('discord.js').Message & { client: import('../typings').Client }} message The message which was created.
	 */

	async execute(message) {
		// Declares const to be used.

		const { client, content } = message;
		const guildId = message.guild.id;
		const translations = new Translate(client, guildId);

		// Checks if the bot is mentioned in the message all alone and triggers onMention trigger.
		// You can change the behavior as per your liking at ./messages/onMention.js

		if (
			message.content == `<@${client.user.id}>` ||
			message.content == `<@!${client.user.id}>`
		) {
			require('../messages/onMention').execute(message);
			return;
		}

		/**
		 * @description Converts prefix to lowercase.
		 * @type {String}
		 */

		const checkPrefix = (process.env.PREFIX).toLowerCase();

		/**
		 * @description Regex expression for mention prefix
		 */

		const prefixRegex = new RegExp(
			`^(<@!?${client.user.id}>|${escapeRegex(checkPrefix)})\\s*`,
		);

		// Checks if message content in lower case starts with bot's mention.

		if (!prefixRegex.test(content.toLowerCase())) return;

		/**
		 * @description Checks and returned matched prefix, either mention or prefix in config.
		 */

		const [matchedPrefix] = content.toLowerCase().match(prefixRegex);

		/**
		 * @type {String[]}
		 * @description The Message Content of the received message seperated by spaces (' ') in an array, this excludes prefix and command/alias itself.
		 */

		const args = content.slice(matchedPrefix.length).trim().split(/ +/);

		/**
		 * @type {String}
		 * @description Name of the command received from first argument of the args array.
		 */

		const commandName = args.shift().toLowerCase();

		// Check if mesage does not starts with prefix, or message author is bot. If yes, return.

		if (!message.content.startsWith(matchedPrefix) || message.author.bot) {return;}

		const command =
			client.commands.get(commandName) ||
			client.commands.find(
				(cmd) => cmd.aliases && cmd.aliases.includes(commandName),
			);

		// It it's not a command, return :)

		if (!command) return;

		const server = await Server.findOne({ guild_id: guildId });

		if (command.init && !server) {
			return message.reply({
				content: translations.translate('SERVER_IS_NOT_INIT'),
			});
		}

		// Owner Only Property, add in your command properties if true.

		if (command.ownerOnly && message.author.id !== process.env.OWNER) {
			return message.reply({
				content: translations.translate('OWNER_ONLY'),
			});
		}

		// Guild Only Property, add in your command properties if true.

		if (command.guildOnly && message.channel.type === ChannelType.DM) {
			return message.reply({
				content: translations.translate('NO_DM'),
			});
		}

		// Author perms property
		// Will skip the permission check if command channel is a DM. Use guildOnly for possible error prone commands!

		if (command.permissions && message.channel.type !== ChannelType.DM) {
			const authorPerms = message.channel.permissionsFor(message.author);
			if (!authorPerms || !authorPerms.has(command.permissions)) {
				return message.reply({
					content: translations.translate('NO_PERMS'),
				});
			}
		}

		// Args missing

		if (command.args && !args.length) {
			let reply = translations.translate('ARGS_MISSING', { author: message.author });

			if (command.usage) {
				reply += `\n${translations.translate('COMMAND_USAGE', { prefix: matchedPrefix, command: command.name, usage: command.usage })}`;
			}

			return message.channel.send({
				content: reply,
			});
		}

		// Cooldowns

		const { cooldowns } = client;

		if (!cooldowns.has(command.name)) {
			cooldowns.set(command.name, new Collection());
		}

		const now = Date.now();
		const timestamps = cooldowns.get(command.name);
		const cooldownAmount = (command.cooldown || 3) * 1000;

		if (timestamps.has(message.author.id)) {
			const expirationTime = timestamps.get(message.author.id) + cooldownAmount;

			if (now < expirationTime) {
				const timeLeft = (expirationTime - now) / 1000;
				return message.reply({
					content: translations.translate('COMMAND_COOLDOWN', { time: timeLeft.toFixed(1), command: command.name }),
				});
			}
		}

		timestamps.set(message.author.id, now);
		setTimeout(() => timestamps.delete(message.author.id), cooldownAmount);

		// Rest your creativity is below.

		// execute the final command. Put everything above this.
		try {
			command.execute(message, args);
		}
		catch (error) {
			console.error(error);
			message.reply({
				content: translations.translate('COMMAND_EXECUTE_ERROR'),
			});
		}
	},
};
