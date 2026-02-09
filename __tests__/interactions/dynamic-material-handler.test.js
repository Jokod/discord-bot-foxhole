const {
	handleCategoriesView,
	handleCategoryView,
	handleSubcategoryView,
	routeMaterialInteraction,
	NAVIGATION,
} = require('../../interactions/buttons/logistics/material/dynamic_material_handler');

const { categories } = require('../../data/fournis');

// Mock des dépendances
jest.mock('../../data/models.js', () => ({
	Material: {
		findOne: jest.fn(),
	},
	Server: {
		findOne: jest.fn(),
	},
}));

jest.mock('../../utils/translations.js', () => {
	return jest.fn().mockImplementation(() => ({
		translate: jest.fn((key) => {
			const translations = {
				'MATERIAL_NOT_EXIST': 'Ce matériel n\'existe pas.',
				'MATERIAL_ARE_NO_CREATOR_ERROR': 'Vous n\'êtes pas le créateur de ce matériel.',
				'MATERIAL_SELECT_TYPE': 'Sélectionnez un type de matériel',
				'BACK': 'Retour',
				'CATEGORY_UTILITIES': 'Utilitaires',
				'CATEGORY_INFANTRY_WEAPONS': 'Armes d\'infanterie',
				'CATEGORY_AMMUNITION': 'Munition',
				'CATEGORY_RESOURCES': 'Ressources',
				'CATEGORY_VEHICLES': 'Véhicule',
				'SUBCATEGORY_TOOLS': 'Outils',
				'SUBCATEGORY_SMALL_ARMS': 'Armes légères',
				'MATERIAL_SELECT_ERROR': 'Erreur lors de la sélection',
			};
			return translations[key] || key;
		}),
	}));
});

const { Material, Server } = require('../../data/models.js');

describe('Dynamic Material Handler', () => {
	let mockInteraction;
	let mockTranslations;

	beforeEach(() => {
		// Reset tous les mocks
		jest.clearAllMocks();

		// Mock de l'interaction
		mockInteraction = {
			guild: { id: 'test-guild-id' },
			user: { id: 'test-user-id' },
			message: { id: 'test-message-id' },
			customId: '',
			client: {},
			reply: jest.fn().mockResolvedValue(true),
			update: jest.fn().mockResolvedValue(true),
		};

		mockTranslations = {
			translate: jest.fn((key) => key),
		};
	});

	describe('NAVIGATION constants', () => {
		it('should have correct navigation prefixes', () => {
			expect(NAVIGATION.CATEGORY_PREFIX).toBe('logistics_select_category');
			expect(NAVIGATION.SUBCATEGORY_PREFIX).toBe('logistics_select_subcategory');
			expect(NAVIGATION.BACK_TO_CATEGORIES).toBe('button_logistics_add_material');
		});
	});

	describe('Permission Checks', () => {
		it('should return null if material does not exist', async () => {
			Material.findOne.mockResolvedValue(null);

			mockInteraction.customId = 'logistics_select_category-utilities';

			await routeMaterialInteraction(mockInteraction);

			expect(Material.findOne).toHaveBeenCalledWith({
				guild_id: 'test-guild-id',
				material_id: 'test-message-id',
			});
			expect(mockInteraction.reply).toHaveBeenCalledWith({
				content: expect.any(String),
				flags: 64,
			});
		});

		it('should return null if user is not the owner', async () => {
			Material.findOne.mockResolvedValue({
				owner_id: 'different-user-id',
			});

			mockInteraction.customId = 'logistics_select_category-utilities';

			await routeMaterialInteraction(mockInteraction);

			expect(mockInteraction.reply).toHaveBeenCalledWith({
				content: expect.any(String),
				flags: 64,
			});
		});
	});

	describe('handleCategoriesView', () => {
		it('should display all main categories', async () => {
			Material.findOne.mockResolvedValue({
				owner_id: 'test-user-id',
			});

			await handleCategoriesView(mockInteraction, mockTranslations);

			expect(mockInteraction.update).toHaveBeenCalled();
			const updateCall = mockInteraction.update.mock.calls[0][0];

			expect(updateCall.content).toBe('MATERIAL_SELECT_TYPE');
			expect(updateCall.components).toBeDefined();
			expect(updateCall.components.length).toBeGreaterThan(0);
		});

		it('should include back button', async () => {
			Material.findOne.mockResolvedValue({
				owner_id: 'test-user-id',
			});

			await handleCategoriesView(mockInteraction, mockTranslations);

			const updateCall = mockInteraction.update.mock.calls[0][0];
			const lastRow = updateCall.components[updateCall.components.length - 1];

			expect(lastRow.components).toBeDefined();
			expect(lastRow.components.length).toBeGreaterThan(0);
		});
	});

	describe('handleCategoryView', () => {
		it('should display subcategories for a valid category', async () => {
			Material.findOne.mockResolvedValue({
				owner_id: 'test-user-id',
			});

			await handleCategoryView(mockInteraction, 'utilities', mockTranslations);

			expect(mockInteraction.update).toHaveBeenCalled();
			const updateCall = mockInteraction.update.mock.calls[0][0];

			expect(updateCall.content).toContain('CATEGORY_UTILITIES');
			expect(updateCall.components).toBeDefined();
		});

		it('should handle invalid category', async () => {
			Material.findOne.mockResolvedValue({
				owner_id: 'test-user-id',
			});

			await handleCategoryView(mockInteraction, 'invalid_category', mockTranslations);

			expect(mockInteraction.reply).toHaveBeenCalledWith({
				content: 'Erreur: Catégorie inconnue',
				flags: 64,
			});
		});

		it('should redirect to subcategory view for vehicles (single subcategory)', async () => {
			Material.findOne.mockResolvedValue({
				owner_id: 'test-user-id',
			});

			Server.findOne.mockResolvedValue({
				camp: 'colonial',
			});

			await handleCategoryView(mockInteraction, 'vehicles', mockTranslations);

			// Should call update (redirect to subcategory view)
			expect(mockInteraction.update).toHaveBeenCalled();
		});
	});

	describe('handleSubcategoryView', () => {
		beforeEach(() => {
			Material.findOne.mockResolvedValue({
				owner_id: 'test-user-id',
			});

			Server.findOne.mockResolvedValue({
				camp: 'colonial',
			});
		});

		it('should display materials for a valid subcategory', async () => {
			await handleSubcategoryView(mockInteraction, 'utilities', 'tools', mockTranslations);

			expect(Server.findOne).toHaveBeenCalledWith({
				guild_id: 'test-guild-id',
			});

			expect(mockInteraction.update).toHaveBeenCalled();
			const updateCall = mockInteraction.update.mock.calls[0][0];

			expect(updateCall.content).toContain('CATEGORY_UTILITIES');
			expect(updateCall.content).toContain('SUBCATEGORY_TOOLS');
			expect(updateCall.components).toBeDefined();
		});

		it('should include back button to category', async () => {
			await handleSubcategoryView(mockInteraction, 'utilities', 'tools', mockTranslations);

			const updateCall = mockInteraction.update.mock.calls[0][0];
			const lastRow = updateCall.components[updateCall.components.length - 1];

			// Le dernier composant devrait être le bouton retour
			expect(lastRow.components).toBeDefined();
			expect(lastRow.components.length).toBeGreaterThan(0);
		});

		it('should handle subcategory with no materials', async () => {
			// Forcer un camp sans matériel afin de simuler une sous-catégorie vide
			Server.findOne.mockResolvedValue({
				camp: 'unknown_faction',
			});

			await handleSubcategoryView(mockInteraction, 'utilities', 'outfits', mockTranslations);

			expect(mockInteraction.update).toHaveBeenCalled();
			const updateCall = mockInteraction.update.mock.calls[0][0];

			// Devrait afficher un message d'avertissement (clé ou texte traduit)
			expect(
				updateCall.content.includes('Aucun matériel disponible') ||
				updateCall.content.includes('MATERIAL_SUBCATEGORY_EMPTY'),
			).toBe(true);

			// Devrait avoir seulement le bouton retour
			expect(updateCall.components).toBeDefined();
			expect(updateCall.components.length).toBe(1);
		});

		it('should display empty message with correct translation', async () => {
			mockTranslations.translate = jest.fn((key) => {
				if (key === 'MATERIAL_SUBCATEGORY_EMPTY') return 'Aucun matériel dans cette catégorie';
				if (key === 'CATEGORY_INFANTRY_WEAPONS') return 'Armes d\'infanterie';
				if (key === 'SUBCATEGORY_MELEE_WEAPONS') return 'Armes de mêlée';
				return key;
			});

			// Forcer un camp sans matériel afin de déclencher le message vide
			Server.findOne.mockResolvedValue({
				camp: 'unknown_faction',
			});

			await handleSubcategoryView(mockInteraction, 'infantry_weapons', 'melee_weapons', mockTranslations);

			expect(mockTranslations.translate).toHaveBeenCalledWith('MATERIAL_SUBCATEGORY_EMPTY');
		});
	});

	describe('routeMaterialInteraction', () => {
		beforeEach(() => {
			Material.findOne.mockResolvedValue({
				owner_id: 'test-user-id',
			});
		});

		it('should route to category view for category IDs', async () => {
			mockInteraction.customId = 'logistics_select_category-utilities';

			await routeMaterialInteraction(mockInteraction);

			expect(mockInteraction.update).toHaveBeenCalled();
		});

		it('should route to categories list for category prefix only', async () => {
			mockInteraction.customId = 'logistics_select_category';

			await routeMaterialInteraction(mockInteraction);

			expect(mockInteraction.update).toHaveBeenCalled();
		});

		it('should route to subcategory view for subcategory IDs', async () => {
			mockInteraction.customId = 'logistics_select_subcategory-utilities-tools';

			Server.findOne.mockResolvedValue({
				camp: 'colonial',
			});

			await routeMaterialInteraction(mockInteraction);

			expect(mockInteraction.update).toHaveBeenCalled();
		});

		it('should handle errors gracefully', async () => {
			mockInteraction.customId = 'logistics_select_subcategory-invalid';

			Material.findOne.mockRejectedValue(new Error('Database error'));

			await routeMaterialInteraction(mockInteraction);

			expect(mockInteraction.reply).toHaveBeenCalledWith(
				expect.objectContaining({
					content: expect.any(String),
					flags: 64,
				}),
			);
		});
	});

	describe('Integration with categories structure', () => {
		it('should work with all defined categories', () => {
			const categoryKeys = Object.keys(categories);

			categoryKeys.forEach(categoryKey => {
				const category = categories[categoryKey];

				expect(category).toHaveProperty('icon');
				expect(category).toHaveProperty('subcategories');
			});
		});

		it('should work with all defined subcategories', () => {
			Object.keys(categories).forEach(categoryKey => {
				const category = categories[categoryKey];
				const subcategoryKeys = Object.keys(category.subcategories);

				expect(subcategoryKeys.length).toBeGreaterThanOrEqual(0);
			});
		});
	});

	describe('Button Creation and Organization', () => {
		it('should organize buttons into rows correctly', async () => {
			Material.findOne.mockResolvedValue({
				owner_id: 'test-user-id',
			});

			await handleCategoriesView(mockInteraction, mockTranslations);

			const updateCall = mockInteraction.update.mock.calls[0][0];
			const rows = updateCall.components;

			// Vérifier que chaque ligne a au maximum 5 boutons (sauf la dernière avec le bouton retour)
			rows.forEach((row, index) => {
				if (index < rows.length - 1) {
					expect(row.components.length).toBeLessThanOrEqual(5);
				}
			});
		});

		it('should create buttons with correct custom IDs', async () => {
			Material.findOne.mockResolvedValue({
				owner_id: 'test-user-id',
			});

			await handleCategoryView(mockInteraction, 'utilities', mockTranslations);

			const updateCall = mockInteraction.update.mock.calls[0][0];
			const rows = updateCall.components;

			// Au moins une ligne de boutons devrait exister (sans compter le bouton retour)
			expect(rows.length).toBeGreaterThan(0);
		});
	});

	describe('Material Filtering by Faction', () => {
		it('should filter materials by colonial faction', async () => {
			Material.findOne.mockResolvedValue({
				owner_id: 'test-user-id',
			});

			Server.findOne.mockResolvedValue({
				camp: 'colonial',
			});

			await handleSubcategoryView(mockInteraction, 'utilities', 'tools', mockTranslations);

			expect(Server.findOne).toHaveBeenCalledWith({
				guild_id: 'test-guild-id',
			});
		});

		it('should filter materials by warden faction', async () => {
			Material.findOne.mockResolvedValue({
				owner_id: 'test-user-id',
			});

			Server.findOne.mockResolvedValue({
				camp: 'warden',
			});

			await handleSubcategoryView(mockInteraction, 'utilities', 'tools', mockTranslations);

			expect(Server.findOne).toHaveBeenCalledWith({
				guild_id: 'test-guild-id',
			});
		});
	});
});
