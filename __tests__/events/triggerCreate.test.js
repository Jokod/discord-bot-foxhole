describe('triggerCreate event', () => {
	let triggerCreate;

	beforeEach(() => {
		jest.resetModules();
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
			client: { triggers: [{ name: ['hello'], execute }] },
			reply,
		};
		const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);

		await triggerCreate.execute(message);

		expect(reply).toHaveBeenCalledWith({ content: 'An error occured while executing the trigger.' });
		consoleSpy.mockRestore();
	});

	it('s\'arrête après le premier trigger déclenché', async () => {
		const exec1 = jest.fn().mockResolvedValue(undefined);
		const exec2 = jest.fn().mockResolvedValue(undefined);
		const message = {
			content: 'hello world',
			author: { bot: false },
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
});
