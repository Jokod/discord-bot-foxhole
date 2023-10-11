require('dotenv').config();
const Translate = require('../utils/translations.js');

module.exports = {
	async execute(message) {
		const translations = new Translate(message.client, message.guild.id);

		return message.channel.send(
			translations.translate('PREFIX_MESSAGE', {
				author: message.author,
				prefix: process.env.PREFIX,
			}),
		);
	},
};
