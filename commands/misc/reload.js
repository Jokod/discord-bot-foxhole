const fs = require('fs');
const Translate = require('../../utils/translations.js');

module.exports = {
	name: 'reload',
	description: 'Reloads a command',
	args: true,
	ownerOnly: true,

	execute(message, args) {
		/**
		 * @type {String}
		 * @description Name of the specifiied command in lowercase.
		 */

		const commandName = args[0].toLowerCase();
		const translations = new Translate(message.client, message.guild?.id);

		const command =
			message.client.commands.get(commandName) ||
			message.client.commands.find(
				(cmd) => cmd.aliases && cmd.aliases.includes(commandName),
			);

		// Command returns if there is no such command with the specific command name or alias.
		if (!command) {
			return message.channel.send({
				content: translations.translate('RELOAD_UNKNOWN', {
					command: commandName,
					author: message.author,
				}),
			});
		}

		/**
		 * @type {String[]}
		 * @description Array of all command categories aka folders.
		 */

		const commandFolders = fs.readdirSync('./commands');

		/**
		 * @type {String}
		 * @description Name of the command category/folder of the specified command.
		 */

		const folderName = commandFolders.find((folder) =>
			fs.readdirSync(`./commands/${folder}`).includes(`${command.name}.js`),
		);

		// Deletes current cache of that specified command.

		delete require.cache[
			require.resolve(`../${folderName}/${command.name}.js`)
		];

		// Tries Registering command again with new code.

		try {

			const newCommand = require(`../${folderName}/${command.name}.js`);

			// Now registers the command in commands Collection. If it fails, the catch block will be executed.
			message.client.commands.set(newCommand.name, newCommand);

			// 🎉 Confirmation sent if reloading was successful!
			message.channel.send({
				content: translations.translate('RELOAD_SUCCESS', { command: command.name }),
			});
		}
		catch (error) {
		// Catch block executes if there is any error in your code. It logs the error in console and also sends back in discord GUI.

			console.error(error);
			message.channel.send({
				content: translations.translate('RELOAD_ERROR', {
					command: command.name,
					error: error.message,
				}),
			});
		}
	},
};
