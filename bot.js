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

/** ********************************************************************/
// Connect to MongoDB

mongoose.connect(process.env.MONGODB_URL)
	.then(() => console.log('Connected to MongoDB'))
	.catch((err) => console.log('Failed to connect to MongoDB', err));


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
client.contextCommands = new Collection();
client.modalCommands = new Collection();
client.cooldowns = new Collection();
client.autocompleteInteractions = new Collection();
client.triggers = new Collection();

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
// Registration of Autocomplete Interactions.

getFiles('./interactions/autocomplete', (command) => {
	client.autocompleteInteractions.set(command.name, command);
});

/** ********************************************************************/
// Registration of Context-Menu Interactions

getFiles('./interactions/context-menus', (command) => {
	client.contextCommands.set(command.data.name, command);
});

/** ********************************************************************/
// Registration of Button-Command Interactions.

getFiles('./interactions/buttons', (command) => {
	client.buttonCommands.set(command.id, command);
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
	...Array.from(client.contextCommands.values()).map((c) => c.data),
];

(async () => {
	try {
		console.log(`Début du déploiement en ${process.env.APP_ENV} de ${commandJsonData.length} (/) commandes.`);

		const route = process.env.APP_ENV === 'dev'
			? Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.TEST_GUILD_ID)
			: Routes.applicationCommands(process.env.CLIENT_ID);

		const data = await rest.put(
			route,
			{ body: commandJsonData },
		);

		console.log(`Réussite du déploiement en ${process.env.APP_ENV} des ${data.length} (/) commandes.`);
	}
	catch (error) {
		console.error(error);
	}
})();

/** ********************************************************************/
// Registration of Message Based Chat Triggers

getFiles('./triggers', (trigger) => {
	client.triggers.set(trigger.name, trigger);
});

/** ********************************************************************/

client.login(process.env.TOKEN);