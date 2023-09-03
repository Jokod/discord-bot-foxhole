const { prefix } = require('../config.json');

module.exports = {
	async execute(message) {
		return message.channel.send(
			`Salut ${message.author}! Mon prefix est \`${prefix}\`, pour avoir de l'aide \`${prefix}help\``,
		);
	},
};
