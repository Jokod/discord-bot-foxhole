const mockTranslate = jest.fn((key) => key);
const mockDefaultSelectError = jest.fn().mockResolvedValue(undefined);
const mockServerFindOne = jest.fn();

jest.mock('../../utils/translations.js', () => jest.fn().mockImplementation(() => ({ translate: mockTranslate })));
jest.mock('../../messages/defaultSelectError', () => ({ execute: mockDefaultSelectError }));
jest.mock('../../data/models.js', () => ({ Server: { findOne: (...args) => mockServerFindOne(...args) } }));

describe('selectInteraction event', () => {
	let selectInteraction;

	beforeEach(() => {
		jest.clearAllMocks();
		mockServerFindOne.mockResolvedValue({ guild_id: 'guild-123' });
		selectInteraction = require('../../events/selectInteraction.js');
	});

	function createInteraction(overrides = {}) {
		return {
			client: { selectCommands: new Map() },
			guild: { id: 'guild-123' },
			customId: 'select_material',
			isStringSelectMenu: () => true,
			reply: jest.fn().mockResolvedValue(undefined),
			...overrides,
		};
	}

	it('ne fait rien si pas un string select menu', async () => {
		const interaction = createInteraction({ isStringSelectMenu: () => false });
		await selectInteraction.execute(interaction);
		expect(mockDefaultSelectError).not.toHaveBeenCalled();
	});

	it('appelle defaultSelectError si commande inconnue', async () => {
		const interaction = createInteraction();
		await selectInteraction.execute(interaction);
		expect(mockDefaultSelectError).toHaveBeenCalledWith(interaction);
	});

	it('résout customId avec préfixe', async () => {
		const mockExecute = jest.fn().mockResolvedValue(undefined);
		const interaction = createInteraction({ customId: 'select_material-123' });
		interaction.client.selectCommands.set('select_material', { execute: mockExecute, init: false });

		await selectInteraction.execute(interaction);

		expect(mockExecute).toHaveBeenCalledWith(interaction);
	});

	it('répond SERVER_IS_NOT_INIT si init et pas serveur', async () => {
		mockServerFindOne.mockResolvedValue(null);
		const mockExecute = jest.fn();
		const interaction = createInteraction();
		interaction.client.selectCommands.set('select_material', { execute: mockExecute, init: true });

		await selectInteraction.execute(interaction);

		expect(interaction.reply).toHaveBeenCalledWith({ content: 'SERVER_IS_NOT_INIT', flags: 64 });
	});

	it('exécute la commande et répond COMMAND_EXECUTE_ERROR si erreur', async () => {
		const mockExecute = jest.fn().mockRejectedValue(new Error('Boom'));
		const interaction = createInteraction();
		interaction.client.selectCommands.set('select_material', { execute: mockExecute, init: false });
		const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);

		await selectInteraction.execute(interaction);

		expect(interaction.reply).toHaveBeenCalledWith({ content: 'COMMAND_EXECUTE_ERROR', flags: 64 });
		consoleSpy.mockRestore();
	});
});
