const { Events } = require("discord.js");
const { Operation, Material, Group } = require("../data/models.js");

module.exports = {
	name: Events.ClientReady,
	once: true,

	/**
	 * @description Executes when client is ready (bot initialization).
	 * @param {import('../typings').Client} client Main Application Client.
	 */
	execute(client) {
		Operation.sync();
		Material.sync();
		Group.sync();

		console.log(`Connecté en tant que ${client.user.tag}!`);
	},
};
