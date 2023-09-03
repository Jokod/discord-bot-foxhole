const { Routes } = require('discord.js');
const { client_id, test_guild_id } = require('../../config.json');

module.exports = {
	name: 'delete_all_slashs',
	description: 'Supprimer toutes les commandes',
	ownerOnly: true,

	execute(message) {

		try {
			console.log('Début de la suppression des commandes...');

			message.client.rest.put(
				Routes.applicationGuildCommands(client_id, test_guild_id),
				// Routes.applicationCommands(client_id),
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
				ephermal: true,
			});
		}
	},
};
