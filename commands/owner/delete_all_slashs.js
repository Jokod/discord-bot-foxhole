require('dotenv').config();
const { Routes } = require('discord.js');

module.exports = {
	name: 'delete_all_slashs',
	description: 'Supprimer toutes les commandes',
	ownerOnly: true,

	execute(message) {

		try {
			console.log('Début de la suppression des commandes...');

			message.client.rest.put(
				Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.TEST_GUILD_ID),
				// Routes.applicationCommands(process.env.CLIENT_ID),
				{
					body: [],
				},
			);

			console.log('Suppression des commandes terminée !');
		}
		catch (error) {
			console.log(error);
			message.channel.send({
				content: `Il y a eu une erreur lors de la suppression des commandes : ${error}`,
				ephemeral: true,
			});
		}
	},
};
