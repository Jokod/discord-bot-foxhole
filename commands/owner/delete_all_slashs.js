require('dotenv').config();
const { Routes } = require('discord.js');

module.exports = {
	name: 'delete_all_slashs',
	description: 'Delete all slash commands.',
	ownerOnly: true,

	execute(message) {

		try {
			console.log('Deleting all slash commands...');

			message.client.rest.put(
				// Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.TEST_GUILD_ID),
				Routes.applicationCommands(process.env.CLIENT_ID),
				{
					body: [],
				},
			);

			console.log('All slash commands deleted!');
		}
		catch (error) {
			console.log(error);
			message.channel.send({
				content: `An error occured while deleting all slash commands.`,
				ephemeral: true,
			});
		}
	},
};
