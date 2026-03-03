require('dotenv').config();
const {
	Client,
	Collection,
	GatewayIntentBits,
	Partials,
	REST,
	Routes,
} = require('discord.js');
const mongoose = require('mongoose');
const getFiles = require('./utils/getFiles');
const { Server } = require('./data/models.js');
const Translate = require('./utils/translations.js');

/** ********************************************************************/
// Connect to MongoDB, then load languages/traductions and login
/** ********************************************************************/

const client = new Client({
	// https://ziad87.net/intents/
	intents: [
		GatewayIntentBits.Guilds,
		GatewayIntentBits.DirectMessages,
		GatewayIntentBits.DirectMessageReactions,
		GatewayIntentBits.MessageContent,
		GatewayIntentBits.GuildScheduledEvents,
		GatewayIntentBits.GuildMessageReactions,
	],
	partials: [Partials.Channel],
});

/** ********************************************************************/
// Below we will be making an event handler!

getFiles('./events', (event) => {
	if (event.once) {
		client.once(event.name, (...args) => event.execute(...args, client));
	}
	else {
		client.on(
			event.name,
			async (...args) => await event.execute(...args, client),
		);
	}
});

/** ********************************************************************/
// Define Collection of Commands, Slash Commands and cooldowns

client.commands = new Collection();
client.slashCommands = new Collection();
client.buttonCommands = new Collection();
client.selectCommands = new Collection();
client.modalCommands = new Collection();
client.cooldowns = new Collection();
client.languages = new Collection();
client.traductions = new Collection();
client.sessions = new Collection();
client.logs = new Collection();

/** ********************************************************************/
// Registration of Message-Based Legacy Commands.

getFiles('./commands', (command) => {
	client.commands.set(command.name, command);
});

/** ********************************************************************/
// Registration of Slash-Command Interactions.

getFiles('./interactions/slash', (command) => {
	client.slashCommands.set(command.data.name, command);
});

/** ********************************************************************/
// Registration of Button-Command Interactions.

getFiles('./interactions/buttons', (command) => {
	const ids = Array.isArray(command.id) ? command.id : [command.id];
	ids.forEach((id) => client.buttonCommands.set(id, command));
});

/** ********************************************************************/
// Registration of Modal-Command Interactions.

getFiles('./interactions/modals', (command) => {
	client.modalCommands.set(command.id, command);
});

/** ********************************************************************/
// Registration of select-menus Interactions

getFiles('./interactions/select-menus', (command) => {
	client.selectCommands.set(command.id, command);
});

/** ********************************************************************/
// Registration of Slash-Commands in Discord API

const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

const commandJsonData = [
	...Array.from(client.slashCommands.values()).map((c) => c.data.toJSON()),
];

(async () => {
	try {
		console.log(`Started refreshing application (/) commands in ${process.env.APP_ENV}...`);

		const route = process.env.APP_ENV === 'dev'
			? Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.TEST_GUILD_ID)
			: Routes.applicationCommands(process.env.CLIENT_ID);

		await rest.put(
			route,
			{ body: commandJsonData },
		);

		console.log(`Successfully reloaded application (/) commands in ${process.env.APP_ENV}.`);
	}
	catch (error) {
		if (error.code === 50001) {
			console.error('❌ Erreur: Le bot n\'a pas les permissions pour enregistrer les commandes slash.');
			console.error('📝 Solution: Réinvitez le bot avec les scopes "bot" ET "applications.commands"');
			console.error(`🔗 URL d'invitation: https://discord.com/api/oauth2/authorize?client_id=${process.env.CLIENT_ID}&permissions=328565001280&scope=bot%20applications.commands`);
			console.error('\n⚠️  Alternative: Changez APP_ENV=prod dans .env pour utiliser les commandes globales (prend 1h à se synchroniser)');
		}
		else {
			console.error(error);
		}
	}
})();

/** ********************************************************************/

// Load all languages (sans DB)

getFiles('./languages', (language) => {
	client.languages.set(language.code, language);
});

/** ********************************************************************/

// Load all logs

getFiles('./var/logs', (log) => {
	const logName = log.split('.')[0];
	client.logs.set(logName);
});

/** ********************************************************************/
// Connexion MongoDB puis démarrage du client Discord

mongoose.connect(process.env.MONGODB_URL, { dbName: process.env.MONGODB_NAME })
	.then(() => {
		console.log('Connected to MongoDB');
		return Server.find();
	})
	.then((servers) => {
		servers.forEach((server) => {
			client.traductions.set(server.guild_id, server.lang || 'en');
		});
		Translate.prototype.compareTranslationKeys(client);
		client.login(process.env.TOKEN);
	})
	.catch((err) => {
		console.error('Failed to connect to MongoDB', err);
		process.exit(1);
	});