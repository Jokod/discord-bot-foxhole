const mockTranslate = jest.fn((key) => key);
const mockServerFindOne = jest.fn();

jest.mock('../../utils/translations.js', () => jest.fn().mockImplementation(() => ({ translate: mockTranslate })));
jest.mock('../../data/models.js', () => ({ Server: { findOne: (...args) => mockServerFindOne(...args) } }));

describe('contextInteraction event', () => {
	let contextInteraction;

	beforeEach(() => {
		jest.clearAllMocks();
		mockServerFindOne.mockResolvedValue({ guild_id: 'guild-123' });
		contextInteraction = require('../../events/contextInteraction.js');
	});

	function createInteraction(overrides = {}) {
		return {
			client: { contextCommands: new Map() },
			guild: { id: 'guild-123' },
			commandName: 'test',
			isContextMenuCommand: () => true,
			isUserContextMenuCommand: () => false,
			isMessageContextMenuCommand: () => false,
			reply: jest.fn().mockResolvedValue(undefined),
			...overrides,
		};
	}

	it('ne fait rien si pas une context menu command', async () => {
		const interaction = createInteraction({ isContextMenuCommand: () => false });
		await contextInteraction.execute(interaction);
		expect(mockServerFindOne).not.toHaveBeenCalled();
	});

	it('ne fait rien si pas de guild', async () => {
		const interaction = createInteraction({ guild: null });
		await contextInteraction.execute(interaction);
		expect(mockServerFindOne).not.toHaveBeenCalled();
	});

	it('exécute USER context command', async () => {
		const mockExecute = jest.fn().mockResolvedValue(undefined);
		const interaction = createInteraction({
			isUserContextMenuCommand: () => true,
			isMessageContextMenuCommand: () => false,
		});
		interaction.client.contextCommands.set('USER test', { execute: mockExecute, init: false });

		await contextInteraction.execute(interaction);

		expect(mockExecute).toHaveBeenCalledWith(interaction);
	});

	it('répond SERVER_IS_NOT_INIT pour USER command si init et pas serveur', async () => {
		mockServerFindOne.mockResolvedValue(null);
		const mockExecute = jest.fn();
		const interaction = createInteraction({
			isUserContextMenuCommand: () => true,
			isMessageContextMenuCommand: () => false,
		});
		interaction.client.contextCommands.set('USER test', { execute: mockExecute, init: true });

		await contextInteraction.execute(interaction);

		expect(interaction.reply).toHaveBeenCalledWith({ content: 'SERVER_IS_NOT_INIT', flags: 64 });
	});

	it('exécute MESSAGE context command', async () => {
		const mockExecute = jest.fn().mockResolvedValue(undefined);
		const interaction = createInteraction({
			isUserContextMenuCommand: () => false,
			isMessageContextMenuCommand: () => true,
		});
		interaction.client.contextCommands.set('MESSAGE test', { execute: mockExecute });

		await contextInteraction.execute(interaction);

		expect(mockExecute).toHaveBeenCalledWith(interaction);
	});

	it('répond COMMAND_EXECUTE_ERROR si USER command lève', async () => {
		const mockExecute = jest.fn().mockRejectedValue(new Error('Boom'));
		const interaction = createInteraction({
			isUserContextMenuCommand: () => true,
			isMessageContextMenuCommand: () => false,
		});
		interaction.client.contextCommands.set('USER test', { execute: mockExecute, init: false });
		const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);

		await contextInteraction.execute(interaction);

		expect(interaction.reply).toHaveBeenCalledWith({ content: 'COMMAND_EXECUTE_ERROR', flags: 64 });
		consoleSpy.mockRestore();
	});

	it('followUp COMMAND_EXECUTE_ERROR si USER command lève après reply', async () => {
		const mockExecute = jest.fn().mockRejectedValue(new Error('Boom'));
		const followUp = jest.fn().mockResolvedValue(undefined);
		const interaction = createInteraction({
			isUserContextMenuCommand: () => true,
			isMessageContextMenuCommand: () => false,
			replied: true,
			deferred: false,
			followUp,
		});
		interaction.client.contextCommands.set('USER test', { execute: mockExecute, init: false });
		const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);

		await contextInteraction.execute(interaction);

		expect(followUp).toHaveBeenCalledWith({ content: 'COMMAND_EXECUTE_ERROR', flags: 64 });
		consoleSpy.mockRestore();
	});

	it('log si l\'envoi d\'erreur USER échoue aussi', async () => {
		const mockExecute = jest.fn().mockRejectedValue(new Error('Boom'));
		const interaction = createInteraction({
			isUserContextMenuCommand: () => true,
			isMessageContextMenuCommand: () => false,
			reply: jest.fn().mockRejectedValue(new Error('Reply failed')),
		});
		interaction.client.contextCommands.set('USER test', { execute: mockExecute, init: false });
		const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);

		await contextInteraction.execute(interaction);

		expect(consoleSpy).toHaveBeenCalledWith(
			'Failed to send error message to interaction:',
			expect.any(Error),
		);
		consoleSpy.mockRestore();
	});

	it('répond COMMAND_EXECUTE_ERROR si MESSAGE command lève', async () => {
		const mockExecute = jest.fn().mockRejectedValue(new Error('Boom'));
		const interaction = createInteraction({
			isUserContextMenuCommand: () => false,
			isMessageContextMenuCommand: () => true,
		});
		interaction.client.contextCommands.set('MESSAGE test', { execute: mockExecute });
		const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);

		await contextInteraction.execute(interaction);

		expect(interaction.reply).toHaveBeenCalledWith({ content: 'COMMAND_EXECUTE_ERROR', flags: 64 });
		consoleSpy.mockRestore();
	});

	it('followUp COMMAND_EXECUTE_ERROR si MESSAGE command lève après defer', async () => {
		const mockExecute = jest.fn().mockRejectedValue(new Error('Boom'));
		const followUp = jest.fn().mockResolvedValue(undefined);
		const interaction = createInteraction({
			isUserContextMenuCommand: () => false,
			isMessageContextMenuCommand: () => true,
			replied: false,
			deferred: true,
			followUp,
		});
		interaction.client.contextCommands.set('MESSAGE test', { execute: mockExecute });
		const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);

		await contextInteraction.execute(interaction);

		expect(followUp).toHaveBeenCalledWith({ content: 'COMMAND_EXECUTE_ERROR', flags: 64 });
		consoleSpy.mockRestore();
	});

	it('log si l\'envoi d\'erreur MESSAGE échoue aussi', async () => {
		const mockExecute = jest.fn().mockRejectedValue(new Error('Boom'));
		const interaction = createInteraction({
			isUserContextMenuCommand: () => false,
			isMessageContextMenuCommand: () => true,
			reply: jest.fn().mockRejectedValue(new Error('Reply failed')),
		});
		interaction.client.contextCommands.set('MESSAGE test', { execute: mockExecute });
		const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);

		await contextInteraction.execute(interaction);

		expect(consoleSpy).toHaveBeenCalledWith(
			'Failed to send error message to interaction:',
			expect.any(Error),
		);
		consoleSpy.mockRestore();
	});

	it('log si ni USER ni MESSAGE (else branch)', async () => {
		const interaction = createInteraction({
			isUserContextMenuCommand: () => false,
			isMessageContextMenuCommand: () => false,
		});
		const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);

		await contextInteraction.execute(interaction);

		expect(consoleSpy).toHaveBeenCalledWith('An error occured while executing the context command.');
		consoleSpy.mockRestore();
	});
});
