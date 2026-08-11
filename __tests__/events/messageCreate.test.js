'use strict';

const { Collection, ChannelType } = require('discord.js');

jest.mock('dotenv', () => ({ config: jest.fn() }));

const mockTranslate = jest.fn((key, params) => {
	if (params) return `${key}_${JSON.stringify(params)}`;
	return key;
});
jest.mock('../../utils/translations.js', () => jest.fn().mockImplementation(() => ({
	translate: mockTranslate,
})));

const mockServerFindOne = jest.fn();
jest.mock('../../data/models.js', () => ({
	Server: { findOne: (...args) => mockServerFindOne(...args) },
}));

const mockOnMention = jest.fn();
jest.mock('../../messages/onMention', () => ({ execute: mockOnMention }));

describe('messageCreate event', () => {
	let messageCreate;
	const prevPrefix = process.env.PREFIX;
	const prevOwner = process.env.OWNER;

	beforeAll(() => {
		process.env.PREFIX = '!';
		process.env.OWNER = 'owner-1';
	});

	afterAll(() => {
		process.env.PREFIX = prevPrefix;
		process.env.OWNER = prevOwner;
	});

	beforeEach(() => {
		jest.clearAllMocks();
		jest.resetModules();
		mockServerFindOne.mockResolvedValue({ guild_id: 'g1' });
		messageCreate = require('../../events/messageCreate.js');
	});

	function message(overrides = {}) {
		const commands = new Collection();
		const cooldowns = new Collection();
		return {
			client: {
				user: { id: 'bot-1' },
				commands,
				cooldowns,
			},
			guild: { id: 'g1' },
			content: '!ping',
			author: { id: 'u1', bot: false },
			channel: {
				type: ChannelType.GuildText,
				permissionsFor: jest.fn(() => ({ has: () => true })),
				send: jest.fn().mockResolvedValue(undefined),
			},
			reply: jest.fn().mockResolvedValue(undefined),
			...overrides,
		};
	}

	it('ignore les messages hors guild', async () => {
		const msg = message({ guild: null });
		await messageCreate.execute(msg);
		expect(mockOnMention).not.toHaveBeenCalled();
	});

	it('déclenche onMention si mention seule', async () => {
		const msg = message({ content: '<@bot-1>' });
		await messageCreate.execute(msg);
		expect(mockOnMention).toHaveBeenCalledWith(msg);
	});

	it('ignore sans préfixe', async () => {
		const msg = message({ content: 'hello' });
		await messageCreate.execute(msg);
		expect(msg.reply).not.toHaveBeenCalled();
	});

	it('ignore commande inconnue', async () => {
		const msg = message({ content: '!unknown' });
		await messageCreate.execute(msg);
		expect(msg.reply).not.toHaveBeenCalled();
	});

	it('refuse command.init sans serveur', async () => {
		mockServerFindOne.mockResolvedValue(null);
		const msg = message({ content: '!ping' });
		msg.client.commands.set('ping', { name: 'ping', init: true, execute: jest.fn() });
		await messageCreate.execute(msg);
		expect(msg.reply).toHaveBeenCalledWith(expect.objectContaining({
			content: 'SERVER_IS_NOT_INIT',
		}));
	});

	it('refuse ownerOnly pour non-owner', async () => {
		const msg = message({ content: '!admin' });
		msg.client.commands.set('admin', {
			name: 'admin',
			ownerOnly: true,
			execute: jest.fn(),
		});
		await messageCreate.execute(msg);
		expect(msg.reply).toHaveBeenCalledWith(expect.objectContaining({ content: 'OWNER_ONLY' }));
	});

	it('refuse guildOnly en DM', async () => {
		const msg = message({
			content: '!ping',
			channel: { type: ChannelType.DM, send: jest.fn() },
		});
		msg.client.commands.set('ping', {
			name: 'ping',
			guildOnly: true,
			execute: jest.fn(),
		});
		await messageCreate.execute(msg);
		expect(msg.reply).toHaveBeenCalledWith(expect.objectContaining({ content: 'NO_DM' }));
	});

	it('refuse sans permissions', async () => {
		const msg = message({ content: '!ping' });
		msg.channel.permissionsFor.mockReturnValue({ has: () => false });
		msg.client.commands.set('ping', {
			name: 'ping',
			permissions: ['ManageGuild'],
			execute: jest.fn(),
		});
		await messageCreate.execute(msg);
		expect(msg.reply).toHaveBeenCalledWith(expect.objectContaining({ content: 'NO_PERMS' }));
	});

	it('demande les args manquants avec usage', async () => {
		const msg = message({ content: '!echo' });
		msg.client.commands.set('echo', {
			name: 'echo',
			args: true,
			usage: '<text>',
			execute: jest.fn(),
		});
		await messageCreate.execute(msg);
		expect(msg.channel.send).toHaveBeenCalledWith(expect.objectContaining({
			content: expect.stringContaining('ARGS_MISSING'),
		}));
	});

	it('applique le cooldown', async () => {
		const execute = jest.fn();
		const msg = message({ content: '!ping' });
		msg.client.commands.set('ping', { name: 'ping', cooldown: 5, execute });
		const stamps = new Collection();
		stamps.set('u1', Date.now());
		msg.client.cooldowns.set('ping', stamps);

		await messageCreate.execute(msg);
		expect(execute).not.toHaveBeenCalled();
		expect(msg.reply).toHaveBeenCalledWith(expect.objectContaining({
			content: expect.stringContaining('COMMAND_COOLDOWN'),
		}));
	});

	it('exécute la commande (préfixe et alias)', async () => {
		const execute = jest.fn();
		const msg = message({ content: '!p arg1' });
		msg.client.commands.set('ping', {
			name: 'ping',
			aliases: ['p'],
			execute,
		});
		jest.useFakeTimers();
		await messageCreate.execute(msg);
		expect(execute).toHaveBeenCalledWith(msg, ['arg1']);
		jest.runOnlyPendingTimers();
		jest.useRealTimers();
	});

	it('répond COMMAND_EXECUTE_ERROR si execute throw', async () => {
		const msg = message({ content: '!ping' });
		msg.client.commands.set('ping', {
			name: 'ping',
			execute: () => {
				throw new Error('boom');
			},
		});
		const err = jest.spyOn(console, 'error').mockImplementation(() => undefined);
		await messageCreate.execute(msg);
		err.mockRestore();
		expect(msg.reply).toHaveBeenCalledWith(expect.objectContaining({
			content: 'COMMAND_EXECUTE_ERROR',
		}));
	});

	it('ignore bot author même avec préfixe', async () => {
		const execute = jest.fn();
		const msg = message({ content: '!ping', author: { id: 'u1', bot: true } });
		msg.client.commands.set('ping', { name: 'ping', execute });
		await messageCreate.execute(msg);
		expect(execute).not.toHaveBeenCalled();
	});

	it('refuse sans permissions quand permissionsFor null', async () => {
		const msg = message({ content: '!ping' });
		msg.channel.permissionsFor.mockReturnValue(null);
		msg.client.commands.set('ping', {
			name: 'ping',
			permissions: ['ManageGuild'],
			execute: jest.fn(),
		});
		await messageCreate.execute(msg);
		expect(msg.reply).toHaveBeenCalledWith(expect.objectContaining({ content: 'NO_PERMS' }));
	});

	it('refuse quand permissionsFor.has retourne false', async () => {
		const msg = message({ content: '!ping' });
		msg.channel.permissionsFor.mockReturnValue({ has: () => false });
		msg.client.commands.set('ping', {
			name: 'ping',
			permissions: ['ManageGuild'],
			execute: jest.fn(),
		});
		await messageCreate.execute(msg);
		expect(msg.reply).toHaveBeenCalledWith(expect.objectContaining({ content: 'NO_PERMS' }));
	});

	it('demande args sans usage si command.usage absent', async () => {
		const msg = message({ content: '!echo' });
		msg.client.commands.set('echo', {
			name: 'echo',
			args: true,
			execute: jest.fn(),
		});
		await messageCreate.execute(msg);
		expect(msg.channel.send).toHaveBeenCalledWith(expect.objectContaining({
			content: expect.stringContaining('ARGS_MISSING'),
		}));
		expect(msg.channel.send.mock.calls[0][0].content).not.toContain('COMMAND_USAGE');
	});

	it('exécute si cooldown expiré', async () => {
		const execute = jest.fn();
		const msg = message({ content: '!ping' });
		msg.client.commands.set('ping', { name: 'ping', cooldown: 1, execute });
		const stamps = new Collection();
		stamps.set('u1', Date.now() - 5000);
		msg.client.cooldowns.set('ping', stamps);
		jest.useFakeTimers();
		await messageCreate.execute(msg);
		expect(execute).toHaveBeenCalled();
		jest.runOnlyPendingTimers();
		jest.useRealTimers();
	});

	it('accepte mention comme préfixe', async () => {
		const execute = jest.fn();
		const msg = message({ content: '<@bot-1> ping' });
		msg.client.commands.set('ping', { name: 'ping', execute });
		jest.useFakeTimers();
		await messageCreate.execute(msg);
		expect(execute).toHaveBeenCalled();
		jest.runOnlyPendingTimers();
		jest.useRealTimers();
	});

	it('exécute commande quand permissions requises présentes', async () => {
		const execute = jest.fn();
		const msg = message({ content: '!ping' });
		msg.channel.permissionsFor.mockReturnValue({ has: () => true });
		msg.client.commands.set('ping', {
			name: 'ping',
			permissions: ['ManageGuild'],
			execute,
		});
		jest.useFakeTimers();
		await messageCreate.execute(msg);
		expect(execute).toHaveBeenCalled();
		jest.runOnlyPendingTimers();
		jest.useRealTimers();
	});
});
