module.exports = {
	name: ['your', 'trigger', 'words', 'in', 'array'],

	execute(message) {
		// Put all your trigger code over here. This code will be executed when any of the element in the "name" array is found in the message content.

		message.channel.send({
			content: 'Set this trigger response from `./triggers/reactions/hello.js`',
		});
	},
};
