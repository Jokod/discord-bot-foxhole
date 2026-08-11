const mockTranslate = jest.fn((key) => key);

jest.mock('../../utils/translations.js', () => jest.fn().mockImplementation(() => ({
	translate: mockTranslate,
})));

describe('triggerCreate event', () => {
	let triggerCreate;

	beforeEach(() => {
		jest.resetModules();
		jest.clearAllMocks();
		mockTranslate.mockImplementation((key) => key);
		triggerCreate = require('../../events/triggerCreate.js');
	});

	it('exporte name MessageCreate et execute', () => {
		expect(triggerCreate.name).toBe('messageCreate');
		expect(typeof triggerCreate.execute).toBe('function');
	});

	it('ne fait rien si author.bot', async () => {
		const execute = jest.fn();
		const message = {
			content: 'hello',
			author: { bot: true },
			guild: { id: 'g1' },
			client: { triggers: [{ name: ['hello'], execute }] },
			reply: jest.fn(),
		};

		await triggerCreate.execute(message);

		expect(execute).not.toHaveBeenCalled();
	});

	it('ne fait rien hors guild', async () => {
		const execute = jest.fn();
		const message = {
			content: 'hello',
			author: { bot: false },
			guild: null,
			client: { triggers: [{ name: ['hello'], execute }] },
			reply: jest.fn(),
		};

		await triggerCreate.execute(message);

		expect(execute).not.toHaveBeenCalled();
	});

	it('exécute le trigger si le message contient le nom', async () => {
		const execute = jest.fn().mockResolvedValue(undefined);
		const message = {
			content: 'hello world',
			author: { bot: false },
			guild: { id: 'g1' },
			client: { triggers: [{ name: ['hello'], execute }] },
			reply: jest.fn().mockResolvedValue(undefined),
		};

		await triggerCreate.execute(message);

		expect(execute).toHaveBeenCalledWith(message, ['hello', 'world']);
	});

	it('répond erreur si le trigger lève', async () => {
		const execute = jest.fn().mockImplementation(() => { throw new Error('Boom'); });
		const reply = jest.fn().mockResolvedValue(undefined);
		const message = {
			content: 'hello',
			author: { bot: false },
			guild: { id: 'g1' },
			client: { triggers: [{ name: ['hello'], execute }], traductions: new Map() },
			reply,
		};
		const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);

		await triggerCreate.execute(message);

		expect(reply).toHaveBeenCalledWith({ content: 'COMMAND_EXECUTE_ERROR' });
		consoleSpy.mockRestore();
	});

	it('s\'arrête après le premier trigger déclenché', async () => {
		const exec1 = jest.fn().mockResolvedValue(undefined);
		const exec2 = jest.fn().mockResolvedValue(undefined);
		const message = {
			content: 'hello world',
			author: { bot: false },
			guild: { id: 'g1' },
			client: {
				triggers: [
					{ name: ['hello'], execute: exec1 },
					{ name: ['world'], execute: exec2 },
				],
			},
			reply: jest.fn(),
		};

		await triggerCreate.execute(message);

		expect(exec1).toHaveBeenCalled();
		expect(exec2).not.toHaveBeenCalled();
	});

	it('s\'arrête quand triggered déjà true dans outer every', async () => {
		const exec1 = jest.fn();
		const exec2 = jest.fn();
		const message = {
			content: 'hello',
			author: { bot: false },
			guild: { id: 'g1' },
			client: {
				triggers: [
					{ name: ['hello'], execute: exec1 },
					{ name: ['hello'], execute: exec2 },
				],
			},
			reply: jest.fn(),
		};

		await triggerCreate.execute(message);

		expect(exec1).toHaveBeenCalledTimes(1);
		expect(exec2).not.toHaveBeenCalled();
	});

	it('inner loop continue si alias absent du message', async () => {
		const execute = jest.fn();
		const message = {
			content: 'hello world',
			author: { bot: false },
			guild: { id: 'g1' },
			client: {
				triggers: [{ name: ['missing', 'hello'], execute }],
			},
			reply: jest.fn(),
		};

		await triggerCreate.execute(message);

		expect(execute).toHaveBeenCalledTimes(1);
	});
});
