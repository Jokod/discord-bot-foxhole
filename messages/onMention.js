require('dotenv').config();

module.exports = {
	async execute(message) {
		return message.channel.send(
			`Salut ${message.author}! Mon prefix est \`${process.env.PREFIX}\`, pour avoir de l'aide \`${process.env.PREFIX}help\``,
		);
	},
};
