const mockTranslate = jest.fn((key) => key);
const mockDefaultButtonError = jest.fn().mockResolvedValue(undefined);

jest.mock('../../utils/translations.js', () => jest.fn().mockImplementation(() => ({ translate: mockTranslate })));
jest.mock('../../messages/defaultButtonError', () => ({ execute: mockDefaultButtonError }));

const mockServerFindOne = jest.fn();
jest.mock('../../data/models.js', () => ({
	Server: { findOne: (...args) => mockServerFindOne(...args) },
}));

describe('buttonInteraction event', () => {
	let buttonInteraction;

	beforeEach(() => {
		jest.clearAllMocks();
		mockServerFindOne.mockResolvedValue({ guild_id: 'guild-123' });
		buttonInteraction = require('../../events/buttonInteraction.js');
	});

	function createInteraction(overrides = {}) {
		return {
			client: { buttonCommands: new Map() },
			guild: { id: 'guild-123' },
			customId: 'test_button',
			isButton: () => true,
			reply: jest.fn().mockResolvedValue(undefined),
			...overrides,
		};
	}

	it('ne fait rien si l\'interaction n\'est pas un bouton', async () => {
		const interaction = createInteraction({ isButton: () => false });
		await buttonInteraction.execute(interaction);
		expect(mockDefaultButtonError).not.toHaveBeenCalled();
		expect(interaction.reply).not.toHaveBeenCalled();
	});

	it('appelle defaultButtonError si la commande est inconnue', async () => {
		const interaction = createInteraction();
		await buttonInteraction.execute(interaction);
		expect(mockDefaultButtonError).toHaveBeenCalledWith(interaction);
	});

	it('résout le customId avec préfixe (ex: stockpile_reset-1)', async () => {
		const mockExecute = jest.fn().mockResolvedValue(undefined);
		const interaction = createInteraction({ customId: 'stockpile_reset-1' });
		interaction.client.buttonCommands.set('stockpile_reset', { execute: mockExecute, init: false });

		await buttonInteraction.execute(interaction);

		expect(mockExecute).toHaveBeenCalledWith(interaction);
		expect(mockDefaultButtonError).not.toHaveBeenCalled();
	});

	it('répond SERVER_IS_NOT_INIT si command.init et serveur absent', async () => {
		mockServerFindOne.mockResolvedValue(null);
		const mockExecute = jest.fn();
		const interaction = createInteraction();
		interaction.client.buttonCommands.set('test_button', { execute: mockExecute, init: true });

		await buttonInteraction.execute(interaction);

		expect(mockExecute).not.toHaveBeenCalled();
		expect(interaction.reply).toHaveBeenCalledWith({
			content: 'SERVER_IS_NOT_INIT',
			flags: 64,
		});
	});

	it('exécute la commande si serveur présent et command non init', async () => {
		const mockExecute = jest.fn().mockResolvedValue(undefined);
		const interaction = createInteraction();
		interaction.client.buttonCommands.set('test_button', { execute: mockExecute, init: false });

		await buttonInteraction.execute(interaction);

		expect(mockExecute).toHaveBeenCalledWith(interaction);
		expect(interaction.reply).not.toHaveBeenCalled();
	});

	it('exécute la commande si command.init et serveur présent', async () => {
		const mockExecute = jest.fn().mockResolvedValue(undefined);
		const interaction = createInteraction();
		interaction.client.buttonCommands.set('test_button', { execute: mockExecute, init: true });

		await buttonInteraction.execute(interaction);

		expect(mockExecute).toHaveBeenCalledWith(interaction);
	});

	it('répond COMMAND_EXECUTE_ERROR si la commande lève une erreur', async () => {
		const mockExecute = jest.fn().mockRejectedValue(new Error('Boom'));
		const interaction = createInteraction();
		interaction.client.buttonCommands.set('test_button', { execute: mockExecute, init: false });

		const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);

		await buttonInteraction.execute(interaction);

		expect(interaction.reply).toHaveBeenCalledWith({
			content: 'COMMAND_EXECUTE_ERROR',
			flags: 64,
		});
		expect(consoleSpy).toHaveBeenCalled();

		consoleSpy.mockRestore();
	});
});
