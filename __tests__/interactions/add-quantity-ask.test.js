const mockTranslate = jest.fn((key) => key);
const mockMaterialFindOne = jest.fn();
const mockMaterialUpdateOne = jest.fn();

jest.mock('../../data/models.js', () => ({
	Material: {
		findOne: (...args) => mockMaterialFindOne(...args),
		updateOne: (...args) => mockMaterialUpdateOne(...args),
	},
}));
jest.mock('../../utils/translations.js', () => jest.fn().mockImplementation(() => ({ translate: mockTranslate })));

const mockResponse = jest.fn().mockResolvedValue(undefined);
jest.mock('../../utils/interaction/response_material.js', () => class MockResponseMaterial {
	async response() { return mockResponse(); }
});

describe('Modal logistics add quantity ask', () => {
	let modalHandler;

	beforeEach(() => {
		jest.clearAllMocks();
		modalHandler = require('../../interactions/modals/logistics/material/add_quantity_ask.js');
	});

	function createInteraction(quantityValue = '100') {
		return {
			client: {},
			guild: { id: 'guild-123' },
			message: { id: 'msg-456' },
			fields: { getTextInputValue: jest.fn().mockReturnValue(quantityValue) },
			reply: jest.fn().mockResolvedValue(undefined),
			update: jest.fn().mockResolvedValue(undefined),
		};
	}

	it('a la structure correcte', () => {
		expect(modalHandler.id).toBe('modal_logistics_add_quantity_ask');
	});

	it('répond MATERIAL_QUANTITY_ERROR si quantité invalide (nan)', async () => {
		const interaction = createInteraction('abc');

		await modalHandler.execute(interaction);

		expect(interaction.reply).toHaveBeenCalledWith({
			content: 'MATERIAL_QUANTITY_ERROR',
			flags: 64,
		});
	});

	it('répond MATERIAL_QUANTITY_ERROR si quantité négative', async () => {
		const interaction = createInteraction('-5');

		await modalHandler.execute(interaction);

		expect(interaction.reply).toHaveBeenCalledWith({
			content: 'MATERIAL_QUANTITY_ERROR',
			flags: 64,
		});
	});

	it('répond MATERIAL_QUANTITY_ERROR si format invalide (>5 chiffres)', async () => {
		const interaction = createInteraction('123456');

		await modalHandler.execute(interaction);

		expect(interaction.reply).toHaveBeenCalledWith({
			content: 'MATERIAL_QUANTITY_ERROR',
			flags: 64,
		});
	});

	it('met à jour quantityAsk et appelle ResponseMaterial si valide', async () => {
		const material = { owner_id: 'u1', material_id: 'msg-456', quantityAsk: 50 };
		mockMaterialFindOne.mockResolvedValue(material);
		mockMaterialUpdateOne.mockResolvedValue({ modifiedCount: 1 });
		const interaction = createInteraction('200');

		await modalHandler.execute(interaction);

		expect(mockMaterialUpdateOne).toHaveBeenCalledWith(
			{ guild_id: 'guild-123', material_id: 'msg-456' },
			{ quantityAsk: '200' },
		);
		expect(mockResponse).toHaveBeenCalled();
	});

	it('répond MATERIAL_NOT_EXIST si material introuvable après update', async () => {
		mockMaterialUpdateOne.mockResolvedValue({});
		mockMaterialFindOne.mockResolvedValue(null);
		const interaction = createInteraction('100');

		await modalHandler.execute(interaction);

		expect(interaction.reply).toHaveBeenCalledWith({
			content: 'MATERIAL_NOT_EXIST',
			flags: 64,
		});
	});

	it('répond MATERIAL_SELECT_ERROR en cas d\'erreur', async () => {
		mockMaterialUpdateOne.mockRejectedValue(new Error('DB error'));
		const interaction = createInteraction('100');
		const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);

		await modalHandler.execute(interaction);

		expect(interaction.reply).toHaveBeenCalledWith({
			content: 'MATERIAL_SELECT_ERROR',
			flags: 64,
		});
		consoleSpy.mockRestore();
	});
});
