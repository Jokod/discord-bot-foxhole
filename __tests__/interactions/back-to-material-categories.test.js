const mockTranslate = jest.fn((key) => key);
const mockMaterialFindOne = jest.fn();
const mockCanManageMaterial = jest.fn();

jest.mock('../../data/models.js', () => ({
	Material: { findOne: (...args) => mockMaterialFindOne(...args) },
}));
jest.mock('../../utils/translations.js', () => jest.fn().mockImplementation(() => ({ translate: mockTranslate })));
jest.mock('../../utils/material-permissions.js', () => ({ canManageMaterial: (...args) => mockCanManageMaterial(...args) }));

const mockResponse = jest.fn().mockResolvedValue(undefined);
jest.mock('../../utils/interaction/response_material.js', () => class MockResponseMaterial {
	async response() { return mockResponse(); }
});

describe('Button logistics select material back', () => {
	let backHandler;

	beforeEach(() => {
		jest.clearAllMocks();
		backHandler = require('../../interactions/buttons/logistics/material/categories/back_to_material.js');
	});

	function createInteraction() {
		return {
			client: {},
			guild: { id: 'guild-123' },
			message: { id: 'msg-456' },
			user: { id: 'user-789' },
			reply: jest.fn().mockResolvedValue(undefined),
			update: jest.fn().mockResolvedValue(undefined),
		};
	}

	it('a la structure correcte', () => {
		expect(backHandler.id).toBe('logistics_select_material_back');
	});

	it('répond MATERIAL_NOT_EXIST si le matériel n\'existe pas', async () => {
		mockMaterialFindOne.mockResolvedValue(null);
		const interaction = createInteraction();

		await backHandler.execute(interaction);

		expect(interaction.reply).toHaveBeenCalledWith({
			content: 'MATERIAL_NOT_EXIST',
			flags: 64,
		});
	});

	it('répond MATERIAL_CANNOT_MANAGE_ERROR si canManageMaterial false', async () => {
		mockMaterialFindOne.mockResolvedValue({ owner_id: 'user-789', material_id: 'msg-456' });
		mockCanManageMaterial.mockReturnValue(false);
		const interaction = createInteraction();

		await backHandler.execute(interaction);

		expect(interaction.reply).toHaveBeenCalledWith({
			content: 'MATERIAL_CANNOT_MANAGE_ERROR',
			flags: 64,
		});
	});

	it('appelle ResponseMaterial.response si matériel trouvé et canManage', async () => {
		const material = { owner_id: 'user-789', material_id: 'msg-456' };
		mockMaterialFindOne.mockResolvedValue(material);
		mockCanManageMaterial.mockReturnValue(true);
		const interaction = createInteraction();

		await backHandler.execute(interaction);

		expect(mockResponse).toHaveBeenCalled();
	});

	it('répond MATERIAL_BACK_ERROR en cas d\'erreur', async () => {
		mockMaterialFindOne.mockRejectedValue(new Error('DB error'));
		const interaction = createInteraction();
		const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);

		await backHandler.execute(interaction);

		expect(interaction.reply).toHaveBeenCalledWith({
			content: 'MATERIAL_BACK_ERROR',
			flags: 64,
		});
		consoleSpy.mockRestore();
	});
});
