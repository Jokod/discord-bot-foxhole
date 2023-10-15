const { Events } = require('discord.js');
const Logs = require('../utils/logs.js');

module.exports = {
	name: Events.InteractionCreate,
	async execute(interaction) {
		new Logs(interaction).write();
	},
};
