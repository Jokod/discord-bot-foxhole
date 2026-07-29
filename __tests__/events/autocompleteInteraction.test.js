jest.mock('../../data/models.js', () => ({
	Server: { findOne: jest.fn() },
}));
jest.mock('../../utils/translations.js', () => jest.fn().mockImplementation(() => ({
	translate: (key) => key,
})));

const { Server } = require('../../data/models.js');

describe('autocompleteInteraction event', () => {
	let autocompleteInteraction;

	beforeEach(() => {
		jest.clearAllMocks();
		jest.resetModules();
		autocompleteInteraction = require('../../events/autocompleteInteraction.js');
	});

	function createInteraction(overrides = {}) {
		return {
			client: { autocompleteInteractions: new Map() },
			guild: { id: 'guild-1' },
			commandName: 'stockpile',
			isAutocomplete: () => true,
			reply: jest.fn().mockResolvedValue(undefined),
			respond: jest.fn().mockResolvedValue(undefined),
			responded: false,
			...overrides,
		};
	}

	it('ne fait rien si pas une autocomplete', async () => {
		const interaction = createInteraction({ isAutocomplete: () => false });
		await autocompleteInteraction.execute(interaction);
		expect(Server.findOne).not.toHaveBeenCalled();
	});

	it('ne fait rien si request absente du cache', async () => {
		const interaction = createInteraction();
		await autocompleteInteraction.execute(interaction);
		expect(Server.findOne).not.toHaveBeenCalled();
	});

	it('répond vide si init requis et serveur absent', async () => {
		const interaction = createInteraction();
		const mockExecute = jest.fn();
		interaction.client.autocompleteInteractions.set('stockpile', { execute: mockExecute, init: true });
		Server.findOne.mockResolvedValue(null);
		await autocompleteInteraction.execute(interaction);
		expect(mockExecute).not.toHaveBeenCalled();
		expect(interaction.respond).toHaveBeenCalledWith([]);
		expect(interaction.reply).not.toHaveBeenCalled();
	});

	it('exécute la request si présente', async () => {
		const interaction = createInteraction();
		const mockExecute = jest.fn().mockResolvedValue(undefined);
		interaction.client.autocompleteInteractions.set('stockpile', { execute: mockExecute, init: false });
		Server.findOne.mockResolvedValue({ guild_id: 'guild-1' });
		await autocompleteInteraction.execute(interaction);
		expect(mockExecute).toHaveBeenCalledWith(interaction);
	});

	it('répond vide en cas d\'erreur', async () => {
		const interaction = createInteraction();
		const mockExecute = jest.fn().mockRejectedValue(new Error('Boom'));
		interaction.client.autocompleteInteractions.set('stockpile', { execute: mockExecute, init: false });
		Server.findOne.mockResolvedValue({ guild_id: 'guild-1' });
		await autocompleteInteraction.execute(interaction);
		expect(interaction.respond).toHaveBeenCalledWith([]);
	});

	it('ignore les DMs sans planter', async () => {
		const interaction = createInteraction({ guild: null });
		await autocompleteInteraction.execute(interaction);
		expect(interaction.respond).toHaveBeenCalledWith([]);
		expect(Server.findOne).not.toHaveBeenCalled();
	});
});
