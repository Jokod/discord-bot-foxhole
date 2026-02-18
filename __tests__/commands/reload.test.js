const { Collection } = require('discord.js');

const mockReadDirSync = jest.fn();
jest.mock('fs', () => ({ readdirSync: (p) => mockReadDirSync(p) }));

// Must require reload after mock - it will use mocked fs
const reloadModule = () => require('../../commands/misc/reload.js');

describe('Commande reload', () => {
	let reloadCommand;
	let client;

	beforeEach(() => {
		jest.resetModules();
		mockReadDirSync.mockImplementation((p) => {
			if (!p) return [];
			if (String(p).endsWith('commands') || p === './commands') return ['misc'];
			if (String(p).includes('misc')) return ['help.js', 'ping.js', 'reload.js'];
			return [];
		});
		client = { commands: new Collection() };
		client.commands.set('ping', { name: 'ping' });
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
		const message = { client, author: {}, channel: { send } };

		reloadCommand.execute(message, ['unknown']);

		expect(send).toHaveBeenCalledWith(
			expect.objectContaining({ content: expect.stringContaining('no command with name or alias') }),
		);
	});

	it('recharge la commande ping et envoie confirmation', () => {
		const send = jest.fn().mockResolvedValue(undefined);
		const message = { client, author: { toString: () => '@User' }, channel: { send } };

		reloadCommand.execute(message, ['ping']);

		expect(mockReadDirSync).toHaveBeenCalledWith('./commands');
		expect(mockReadDirSync).toHaveBeenCalledWith('./commands/misc');
		expect(send).toHaveBeenCalledWith(
			expect.objectContaining({ content: expect.stringContaining('ping') }),
		);
		expect(send).toHaveBeenCalledWith(
			expect.objectContaining({ content: expect.stringContaining('reloaded') }),
		);
	});

	it('recharge par alias et envoie confirmation', () => {
		const send = jest.fn().mockResolvedValue(undefined);
		client.commands.set('help', { name: 'help', aliases: ['h'] });
		mockReadDirSync.mockImplementation((p) => {
			if (p === './commands') return ['misc'];
			if (p === './commands/misc') return ['help.js', 'ping.js', 'reload.js'];
			return [];
		});
		const message = { client, author: {}, channel: { send } };

		reloadCommand.execute(message, ['h']);

		expect(send).toHaveBeenCalledWith(
			expect.objectContaining({ content: expect.stringContaining('reloaded') }),
		);
	});

});
