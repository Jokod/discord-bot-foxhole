module.exports = {
	name: 'ping',
	// Refer to typings.d.ts for available properties.

	execute(message) {
		message.channel.send({ content: 'Pong.' });
	},
};
