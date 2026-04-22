jest.mock('node:dns', () => ({
	setDefaultResultOrder: jest.fn(),
}));

jest.mock('discord.js', () => {
	class MockClient {
		constructor() {
			this.guilds = { cache: new Map() };
			this.login = jest.fn().mockResolvedValue('ok');
			this.once = jest.fn();
			this.on = jest.fn();
		}
	}

	class MockCollection extends Map {}

	return {
		Client: MockClient,
		Collection: MockCollection,
		GatewayIntentBits: {
			Guilds: 1,
			DirectMessages: 2,
			DirectMessageReactions: 4,
			MessageContent: 8,
			GuildScheduledEvents: 16,
			GuildMessageReactions: 32,
		},
		Partials: { Channel: 1 },
		REST: jest.fn().mockImplementation(() => ({
			setToken() {
				return this;
			},
			put: jest.fn().mockResolvedValue(undefined),
		})),
		Routes: {
			applicationGuildCommands: jest.fn().mockReturnValue('guild-route'),
			applicationCommands: jest.fn().mockReturnValue('global-route'),
		},
	};
});

jest.mock('mongoose', () => ({
	connect: jest.fn(),
}));

jest.mock('../utils/getFiles', () => jest.fn());
jest.mock('../data/models.js', () => ({
	Server: {
		find: jest.fn().mockResolvedValue([]),
	},
}));
jest.mock('../utils/translations.js', () => {
	function MockTranslate() {
		// no-op: constructor placeholder for the jest mock
	}
	MockTranslate.prototype.compareTranslationKeys = jest.fn();
	return MockTranslate;
});

describe('bot.js', () => {
	beforeEach(() => {
		jest.resetModules();
		jest.clearAllMocks();
	});

	it('configureDns sets ipv4first result order', () => {
		const dns = require('node:dns');
		const { configureDns } = require('../bot.js');

		configureDns();

		expect(dns.setDefaultResultOrder).toHaveBeenCalledWith('ipv4first');
	});

	it('connectToMongoWithRetry retries after first failure', async () => {
		const mongoose = require('mongoose');
		const { connectToMongoWithRetry } = require('../bot.js');
		const timeoutSpy = jest.spyOn(global, 'setTimeout').mockImplementation((fn) => {
			fn();
			return 0;
		});

		mongoose.connect
			.mockRejectedValueOnce(new Error('temporary dns error'))
			.mockResolvedValueOnce(undefined);

		await connectToMongoWithRetry();

		expect(mongoose.connect).toHaveBeenCalledTimes(2);
		expect(timeoutSpy).toHaveBeenCalledWith(expect.any(Function), 5000);
		timeoutSpy.mockRestore();
	});
});
