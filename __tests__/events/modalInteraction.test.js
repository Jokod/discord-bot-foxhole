const mockTranslate = jest.fn((key) => key);
const mockDefaultModalError = jest.fn().mockResolvedValue(undefined);
const mockServerFindOne = jest.fn();

jest.mock('../../utils/translations.js', () => jest.fn().mockImplementation(() => ({ translate: mockTranslate })));
jest.mock('../../messages/defaultModalError', () => ({ execute: mockDefaultModalError }));
jest.mock('../../data/models.js', () => ({ Server: { findOne: (...args) => mockServerFindOne(...args) } }));

describe('modalInteraction event', () => {
	let modalInteraction;

	beforeEach(() => {
		jest.clearAllMocks();
		mockServerFindOne.mockResolvedValue({ guild_id: 'guild-123' });
		modalInteraction = require('../../events/modalInteraction.js');
	});

	function createInteraction(overrides = {}) {
		return {
			client: { modalCommands: new Map() },
			guild: { id: 'guild-123' },
			customId: 'test_modal',
			isModalSubmit: () => true,
			reply: jest.fn().mockResolvedValue(undefined),
			...overrides,
		};
	}

	it('ne fait rien si pas un modal submit', async () => {
		const interaction = createInteraction({ isModalSubmit: () => false });
		await modalInteraction.execute(interaction);
		expect(mockDefaultModalError).not.toHaveBeenCalled();
	});

	it('appelle defaultModalError si commande inconnue', async () => {
		const interaction = createInteraction();
		await modalInteraction.execute(interaction);
		expect(mockDefaultModalError).toHaveBeenCalledWith(interaction);
	});

	it('résout customId avec préfixe (ex: stockpile_add-123)', async () => {
		const mockExecute = jest.fn().mockResolvedValue(undefined);
		const interaction = createInteraction({ customId: 'stockpile_add-1' });
		interaction.client.modalCommands.set('stockpile_add', { execute: mockExecute, init: false });

		await modalInteraction.execute(interaction);

		expect(mockExecute).toHaveBeenCalledWith(interaction);
	});

	it('répond SERVER_IS_NOT_INIT si init et pas serveur', async () => {
		mockServerFindOne.mockResolvedValue(null);
		const mockExecute = jest.fn();
		const interaction = createInteraction();
		interaction.client.modalCommands.set('test_modal', { execute: mockExecute, init: true });

		await modalInteraction.execute(interaction);

		expect(interaction.reply).toHaveBeenCalledWith({ content: 'SERVER_IS_NOT_INIT', flags: 64 });
	});

	it('exécute la commande et répond COMMAND_EXECUTE_ERROR si erreur', async () => {
		const mockExecute = jest.fn().mockRejectedValue(new Error('Boom'));
		const interaction = createInteraction();
		interaction.client.modalCommands.set('test_modal', { execute: mockExecute, init: false });
		const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);

		await modalInteraction.execute(interaction);

		expect(interaction.reply).toHaveBeenCalledWith({ content: 'COMMAND_EXECUTE_ERROR', flags: 64 });
		consoleSpy.mockRestore();
	});
});
