const { Collection } = require('discord.js');

const mockTranslate = jest.fn((key, params = {}) => {
	if (key === 'RELOAD_UNKNOWN') return `unknown:${params.command}`;
	if (key === 'RELOAD_SUCCESS') return `reloaded:${params.command}`;
	if (key === 'RELOAD_ERROR') return `error:${params.command}:${params.error}`;
	return key;
});

jest.mock('../../utils/translations.js', () => jest.fn().mockImplementation(() => ({
	translate: mockTranslate,
})));

const mockReadDirSync = jest.fn();
jest.mock('fs', () => ({ readdirSync: (p) => mockReadDirSync(p) }));

// Must require reload after mock - it will use mocked fs
const reloadModule = () => require('../../commands/misc/reload.js');

describe('Commande reload', () => {
	let reloadCommand;
	let client;

	beforeEach(() => {
		jest.resetModules();
		jest.clearAllMocks();
		mockTranslate.mockImplementation((key, params = {}) => {
			if (key === 'RELOAD_UNKNOWN') return `unknown:${params.command}`;
			if (key === 'RELOAD_SUCCESS') return `reloaded:${params.command}`;
			if (key === 'RELOAD_ERROR') return `error:${params.command}:${params.error}`;
			return key;
		});
		mockReadDirSync.mockImplementation((p) => {
			if (!p) return [];
			if (String(p).endsWith('commands') || p === './commands') return ['misc'];
			if (String(p).includes('misc')) return ['reload.js'];
			return [];
		});
		client = { commands: new Collection(), languages: new Map(), traductions: new Map() };
		reloadCommand = reloadModule();
		client.commands.set('reload', reloadCommand);
	});

	it('exporte un module avec name, description, args, ownerOnly', () => {
		expect(reloadCommand.name).toBe('reload');
		expect(reloadCommand.description).toBeDefined();
		expect(reloadCommand.args).toBe(true);
		expect(reloadCommand.ownerOnly).toBe(true);
	});

	it('répond un message si la commande n\'existe pas', () => {
		const send = jest.fn().mockResolvedValue(undefined);
		const message = { client, author: {}, guild: { id: 'g1' }, channel: { send } };

		reloadCommand.execute(message, ['unknown']);

		expect(send).toHaveBeenCalledWith(
			expect.objectContaining({ content: 'unknown:unknown' }),
		);
	});

	it('recharge la commande reload et envoie confirmation', () => {
		const send = jest.fn().mockResolvedValue(undefined);
		const message = { client, author: { toString: () => '@User' }, guild: { id: 'g1' }, channel: { send } };

		reloadCommand.execute(message, ['reload']);

		expect(mockReadDirSync).toHaveBeenCalledWith('./commands');
		expect(mockReadDirSync).toHaveBeenCalledWith('./commands/misc');
		expect(send).toHaveBeenCalledWith(
			expect.objectContaining({ content: 'reloaded:reload' }),
		);
	});

	it('recharge par alias et envoie confirmation', () => {
		const send = jest.fn().mockResolvedValue(undefined);
		client.commands.set('reload', { name: 'reload', aliases: ['rl'] });
		mockReadDirSync.mockImplementation((p) => {
			if (p === './commands') return ['misc'];
			if (p === './commands/misc') return ['reload.js'];
			return [];
		});
		const message = { client, author: {}, guild: { id: 'g1' }, channel: { send } };

		reloadCommand.execute(message, ['rl']);

		expect(send).toHaveBeenCalledWith(
			expect.objectContaining({ content: 'reloaded:reload' }),
		);
	});
});
