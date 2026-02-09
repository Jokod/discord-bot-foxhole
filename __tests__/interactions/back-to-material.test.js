const backToMaterialHandler = require('../../interactions/buttons/logistics/material/back_to_material');

// Mock des dépendances
jest.mock('../../data/models.js', () => ({
	Material: {
		findOne: jest.fn(),
	},
}));

jest.mock('../../utils/interaction/response_material.js', () => {
	return jest.fn().mockImplementation(() => ({
		response: jest.fn().mockResolvedValue(true),
	}));
});

jest.mock('../../utils/translations.js', () => {
	return jest.fn().mockImplementation(() => ({
		translate: jest.fn((key) => {
			const translations = {
				'MATERIAL_NOT_EXIST': 'Ce matériel n\'existe pas.',
				'MATERIAL_ARE_NO_CREATOR_ERROR': 'Vous n\'êtes pas le créateur de ce matériel.',
				'MATERIAL_BACK_ERROR': 'Erreur lors du retour.',
			};
			return translations[key] || key;
		}),
	}));
});

const { Material } = require('../../data/models.js');
const ResponseMaterial = require('../../utils/interaction/response_material.js');

describe('Back to Material Handler', () => {
	let mockInteraction;

	beforeEach(() => {
		jest.clearAllMocks();

		mockInteraction = {
			guild: { id: 'test-guild-id' },
			user: { id: 'test-user-id' },
			message: { id: 'test-message-id' },
			client: {},
			reply: jest.fn().mockResolvedValue(true),
			update: jest.fn().mockResolvedValue(true),
		};
	});

	describe('Module Structure', () => {
		it('should have correct module structure', () => {
			expect(backToMaterialHandler).toHaveProperty('id');
			expect(backToMaterialHandler).toHaveProperty('execute');

			expect(backToMaterialHandler.id).toBe('logistics_select_material_back');
			expect(typeof backToMaterialHandler.execute).toBe('function');
		});

		it('should not have init flag', () => {
			// Ce handler ne nécessite pas d'initialisation de serveur
			expect(backToMaterialHandler.init).toBeUndefined();
		});
	});

	describe('Successful Navigation', () => {
		it('should call ResponseMaterial when material exists and user is owner', async () => {
			Material.findOne.mockResolvedValue({
				owner_id: 'test-user-id',
				material_id: 'test-message-id',
			});

			await backToMaterialHandler.execute(mockInteraction);

			expect(Material.findOne).toHaveBeenCalledWith({
				guild_id: 'test-guild-id',
				material_id: 'test-message-id',
			});

			expect(ResponseMaterial).toHaveBeenCalledWith(
				mockInteraction,
				expect.objectContaining({
					owner_id: 'test-user-id',
				}),
			);

			// Vérifier que la méthode response() a été appelée
			const responseInstance = ResponseMaterial.mock.results[0].value;
			expect(responseInstance.response).toHaveBeenCalled();
		});
	});

	describe('Error Handling', () => {
		it('should handle non-existent material', async () => {
			Material.findOne.mockResolvedValue(null);

			await backToMaterialHandler.execute(mockInteraction);

			expect(mockInteraction.reply).toHaveBeenCalledWith({
				content: expect.any(String),
				flags: 64,
			});

			// ResponseMaterial ne devrait pas être appelé
			expect(ResponseMaterial).not.toHaveBeenCalled();
		});

		it('should handle permission error (user is not owner)', async () => {
			Material.findOne.mockResolvedValue({
				owner_id: 'different-user-id',
				material_id: 'test-message-id',
			});

			await backToMaterialHandler.execute(mockInteraction);

			expect(mockInteraction.reply).toHaveBeenCalledWith({
				content: expect.any(String),
				flags: 64,
			});

			// ResponseMaterial ne devrait pas être appelé
			expect(ResponseMaterial).not.toHaveBeenCalled();
		});

		it('should handle database errors', async () => {
			Material.findOne.mockRejectedValue(new Error('Database error'));

			await backToMaterialHandler.execute(mockInteraction);

			expect(mockInteraction.reply).toHaveBeenCalledWith({
				content: expect.any(String),
				flags: 64,
			});
		});

		it('should handle ResponseMaterial errors', async () => {
			Material.findOne.mockResolvedValue({
				owner_id: 'test-user-id',
				material_id: 'test-message-id',
			});

			// Mock ResponseMaterial pour lancer une erreur
			ResponseMaterial.mockImplementationOnce(() => {
				throw new Error('Response error');
			});

			await backToMaterialHandler.execute(mockInteraction);

			expect(mockInteraction.reply).toHaveBeenCalledWith({
				content: expect.any(String),
				flags: 64,
			});
		});
	});

	describe('Integration', () => {
		it('should work with Discord.js button event handler', () => {
			// Simule la résolution d'ID du buttonInteraction.js
			const customId = 'logistics_select_material_back';

			// Le handler devrait être trouvé directement (pas de split nécessaire)
			expect(backToMaterialHandler.id).toBe(customId);
		});
	});
});
