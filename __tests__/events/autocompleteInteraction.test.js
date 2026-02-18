const mockTranslate = jest.fn((key) => key);
const mockServerFindOne = jest.fn();

jest.mock('../../utils/translations.js', () => jest.fn().mockImplementation(() => ({ translate: mockTranslate })));
jest.mock('../../data/models.js', () => ({ Server: { findOne: (...args) => mockServerFindOne(...args) } }));

describe('autocompleteInteraction event', () => {
	let autocompleteInteraction;

	beforeEach(() => {
		jest.clearAllMocks();
		mockServerFindOne.mockResolvedValue({ guild_id: 'guild-123' });
		autocompleteInteraction = require('../../events/autocompleteInteraction.js');
	});

	function createInteraction(overrides = {}) {
		return {
			client: { autocompleteInteractions: new Map() },
			guild: { id: 'guild-123' },
			commandName: 'stockpile',
			isAutocomplete: () => true,
			reply: jest.fn().mockResolvedValue(undefined),
			...overrides,
		};
	}

	it('ne fait rien si pas une autocomplete', async () => {
		const interaction = createInteraction({ isAutocomplete: () => false });
		await autocompleteInteraction.execute(interaction);
		expect(mockServerFindOne).not.toHaveBeenCalled();
	});

	it('ne fait rien si la requête n\'est pas en cache', async () => {
		const interaction = createInteraction();
		await autocompleteInteraction.execute(interaction);
		expect(mockServerFindOne).not.toHaveBeenCalled();
		expect(interaction.reply).not.toHaveBeenCalled();
	});

	it('répond SERVER_IS_NOT_INIT si request.init et pas de serveur', async () => {
		mockServerFindOne.mockResolvedValue(null);
		const mockExecute = jest.fn();
		const interaction = createInteraction();
		interaction.client.autocompleteInteractions.set('stockpile', { execute: mockExecute, init: true });

		await autocompleteInteraction.execute(interaction);

		expect(mockExecute).not.toHaveBeenCalled();
		expect(interaction.reply).toHaveBeenCalledWith({ content: 'SERVER_IS_NOT_INIT', flags: 64 });
	});

	it('exécute la requête si serveur présent', async () => {
		const mockExecute = jest.fn().mockResolvedValue(undefined);
		const interaction = createInteraction();
		interaction.client.autocompleteInteractions.set('stockpile', { execute: mockExecute, init: false });

		await autocompleteInteraction.execute(interaction);

		expect(mockExecute).toHaveBeenCalledWith(interaction);
	});

	it('rejette si execute lève une erreur', async () => {
		const mockExecute = jest.fn().mockRejectedValue(new Error('Boom'));
		const interaction = createInteraction();
		interaction.client.autocompleteInteractions.set('stockpile', { execute: mockExecute, init: false });
		const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);

		await expect(autocompleteInteraction.execute(interaction)).rejects.toThrow('Boom');

		expect(consoleSpy).toHaveBeenCalled();
		consoleSpy.mockRestore();
	});
});
