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
	constructor(interaction, material) {
		this.interaction = interaction;
		this.material = material;
	}
	async response() { return mockResponse(); }
});

describe('Select logistics material', () => {
	let selectHandler;

	beforeEach(() => {
		jest.resetModules();
		jest.clearAllMocks();
		selectHandler = require('../../interactions/select-menus/logistics/select_material.js');
	});

	function createInteraction(values = ['material-123']) {
		return {
			client: {},
			guild: { id: 'guild-123' },
			message: { id: 'msg-456' },
			user: { id: 'user-789' },
			values,
			reply: jest.fn().mockResolvedValue(undefined),
			update: jest.fn().mockResolvedValue(undefined),
		};
	}

	it('a la structure correcte', () => {
		expect(selectHandler.id).toBe('select_logistics_add_material');
		expect(typeof selectHandler.execute).toBe('function');
	});

	it('répond MATERIAL_NOT_EXIST si le matériel n\'existe pas', async () => {
		mockMaterialFindOne.mockResolvedValue(null);
		const interaction = createInteraction();

		await selectHandler.execute(interaction);

		expect(interaction.reply).toHaveBeenCalledWith({
			content: 'MATERIAL_NOT_EXIST',
			flags: 64,
		});
	});

	it('répond MATERIAL_ARE_NO_CREATOR_ERROR si l\'utilisateur n\'est pas le propriétaire', async () => {
		mockMaterialFindOne
			.mockResolvedValueOnce({ owner_id: 'other-user', material_id: 'msg-456' })
			.mockResolvedValueOnce({ owner_id: 'other-user', material_id: 'msg-456', name: 'Bmat' });
		const interaction = createInteraction();

		await selectHandler.execute(interaction);

		expect(interaction.reply).toHaveBeenCalledWith({
			content: 'MATERIAL_ARE_NO_CREATOR_ERROR',
			flags: 64,
		});
	});

});
