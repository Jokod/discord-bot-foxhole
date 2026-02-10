const { ChannelType, Collection } = require('discord.js');

const mockTranslate = jest.fn((key) => key);

jest.mock('../../utils/translations.js', () => {
	const fn = jest.fn();
	fn.mockImplementation(() => ({ translate: mockTranslate }));
	return fn;
});

jest.mock('../../utils/colors.js', () => ({
	getRandomColor: jest.fn().mockReturnValue(0x3498db),
}));

describe('Legacy command .help', () => {
	let helpCommand;
	let consoleErrorSpy;

	beforeEach(() => {
		jest.resetModules();
		jest.clearAllMocks();
		consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
		process.env.PREFIX = '.';
		helpCommand = require('../../commands/misc/help.js');
	});

	afterEach(() => {
		consoleErrorSpy.mockRestore();
	});

	function createBaseMessage(overrides = {}) {
		const client = {
			commands: new Collection(),
		};

		// Add some fake commands, including help itself
		client.commands.set('help', { name: 'help' });
		client.commands.set('ping', { name: 'ping' });

		const author = {
			tag: 'TestUser#0001',
			send: jest.fn().mockResolvedValue(undefined),
		};

		const channel = {
			type: ChannelType.GuildText,
			send: jest.fn().mockResolvedValue(undefined),
		};

		const message = {
			client,
			author,
			channel,
			guild: { id: 'test-guild-id' },
			reply: jest.fn().mockResolvedValue(undefined),
		};

		return Object.assign(message, overrides);
	}

	it('envoie la liste des commandes en DM et une confirmation dans le salon quand aucun argument n’est fourni', async () => {
		const message = createBaseMessage();

		await helpCommand.execute(message, []);

		expect(message.author.send).toHaveBeenCalledTimes(1);
		const dmOptions = message.author.send.mock.calls[0][0];
		expect(dmOptions.embeds).toHaveLength(1);
		const embed = dmOptions.embeds[0];
		const embedData = embed.data ?? embed;

		expect(embedData.title).toBe('HELP_TITLE_LIST');
		expect(embedData.description).toContain('help');
		expect(embedData.description).toContain('ping');

		// Comme le message vient d’un salon de guilde, une réponse de confirmation est envoyée
		expect(message.reply).toHaveBeenCalledWith({
			content: 'I\'ve sent you a DM with all my commands!',
		});
	});

	it('n’envoie pas de message de confirmation si la commande est appelée en DM', async () => {
		const message = createBaseMessage({
			channel: {
				type: ChannelType.DM,
				send: jest.fn().mockResolvedValue(undefined),
			},
		});

		await helpCommand.execute(message, []);

		expect(message.author.send).toHaveBeenCalledTimes(1);
		expect(message.reply).not.toHaveBeenCalled();
	});

	it('répond avec un message d’erreur si les DM échouent', async () => {
		const message = createBaseMessage();
		message.author.send.mockRejectedValue(new Error('Cannot DM'));

		await helpCommand.execute(message, []);

		expect(consoleErrorSpy).toHaveBeenCalled();
		expect(message.reply).toHaveBeenCalledWith({
			content: 'It seems like I can\'t DM you!',
		});
	});

	it('répond avec COMMAND_UNKNOWN si la commande demandée est inconnue', async () => {
		const message = createBaseMessage();

		await helpCommand.execute(message, ['unknown']);

		expect(message.reply).toHaveBeenCalledWith({
			content: 'COMMAND_UNKNOWN',
		});
	});

	it('envoie un embed détaillé pour une commande existante (résolution par alias)', async () => {
		const detailedCommand = {
			name: 'ping',
			description: 'Ping command description',
			aliases: ['p'],
			cooldown: 7,
			usage: '[foo]',
		};

		const message = createBaseMessage();
		message.client.commands.set('ping', detailedCommand);

		await helpCommand.execute(message, ['p']);

		expect(message.channel.send).toHaveBeenCalledTimes(1);
		const sendOptions = message.channel.send.mock.calls[0][0];
		expect(sendOptions.embeds).toHaveLength(1);
		const embed = sendOptions.embeds[0];
		const embedData = embed.data ?? embed;

		expect(embedData.title).toBe('HELP_TITLE_COMMAND');
		expect(embedData.description).toBe('Ping command description');

		const fields = embedData.fields ?? [];

		const aliasesField = fields.find((f) => f.name === 'Aliases');
		expect(aliasesField).toBeDefined();
		expect(aliasesField.value).toBe('`p`');

		const cooldownField = fields.find((f) => f.name === 'Cooldown');
		expect(cooldownField).toBeDefined();
		expect(cooldownField.value).toBe('7 second(s)');

		const usageField = fields.find((f) => f.name === 'Usage');
		expect(usageField).toBeDefined();
		expect(usageField.value).toBe('`.ping [foo]`');
	});
});

