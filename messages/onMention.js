const { prefix } = require("../config.json");

module.exports = {
	/**
	 * @description Executes when the bot is pinged.
	 * @author Naman Vrati
	 * @param {import('discord.js').Message} message The Message Object of the command.
	 */

	async execute(message) {
		return message.channel.send(
			`Salut ${message.author}! Mon prefix est \`${prefix}\`, pour avoir de l\'aide \`${prefix}help\``
		);
	},
};
