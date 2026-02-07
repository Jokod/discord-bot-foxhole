const categoryHandler = require('../../interactions/buttons/logistics/material/categories/category_handler');
const subcategoryHandler = require('../../interactions/buttons/logistics/material/subcategories/subcategory_handler');

// Mock du router principal
jest.mock('../../interactions/buttons/logistics/material/dynamic_material_handler', () => ({
	routeMaterialInteraction: jest.fn().mockResolvedValue(true),
}));

const { routeMaterialInteraction } = require('../../interactions/buttons/logistics/material/dynamic_material_handler');

describe('Material Interaction Handlers', () => {
	let mockInteraction;

	beforeEach(() => {
		jest.clearAllMocks();

		mockInteraction = {
			guild: { id: 'test-guild-id' },
			user: { id: 'test-user-id' },
			message: { id: 'test-message-id' },
			customId: '',
			client: {},
			reply: jest.fn().mockResolvedValue(true),
			update: jest.fn().mockResolvedValue(true),
		};
	});

	describe('Category Handler', () => {
		it('should have correct module structure', () => {
			expect(categoryHandler).toHaveProperty('id');
			expect(categoryHandler).toHaveProperty('init');
			expect(categoryHandler).toHaveProperty('execute');

			expect(categoryHandler.id).toBe('logistics_select_category');
			expect(categoryHandler.init).toBe(true);
			expect(typeof categoryHandler.execute).toBe('function');
		});

		it('should call routeMaterialInteraction when executed', async () => {
			mockInteraction.customId = 'logistics_select_category-utilities';

			await categoryHandler.execute(mockInteraction);

			expect(routeMaterialInteraction).toHaveBeenCalledWith(mockInteraction);
			expect(routeMaterialInteraction).toHaveBeenCalledTimes(1);
		});

		it('should handle category with underscores in name', async () => {
			mockInteraction.customId = 'logistics_select_category-infantry_weapons';

			await categoryHandler.execute(mockInteraction);

			expect(routeMaterialInteraction).toHaveBeenCalledWith(mockInteraction);
		});

		it('should handle category without suffix (return to list)', async () => {
			mockInteraction.customId = 'logistics_select_category';

			await categoryHandler.execute(mockInteraction);

			expect(routeMaterialInteraction).toHaveBeenCalledWith(mockInteraction);
		});
	});

	describe('Subcategory Handler', () => {
		it('should have correct module structure', () => {
			expect(subcategoryHandler).toHaveProperty('id');
			expect(subcategoryHandler).toHaveProperty('init');
			expect(subcategoryHandler).toHaveProperty('execute');

			expect(subcategoryHandler.id).toBe('logistics_select_subcategory');
			expect(subcategoryHandler.init).toBe(true);
			expect(typeof subcategoryHandler.execute).toBe('function');
		});

		it('should call routeMaterialInteraction when executed', async () => {
			mockInteraction.customId = 'logistics_select_subcategory-utilities-tools';

			await subcategoryHandler.execute(mockInteraction);

			expect(routeMaterialInteraction).toHaveBeenCalledWith(mockInteraction);
			expect(routeMaterialInteraction).toHaveBeenCalledTimes(1);
		});

		it('should handle subcategory with underscores', async () => {
			mockInteraction.customId = 'logistics_select_subcategory-utilities-field_equipment';

			await subcategoryHandler.execute(mockInteraction);

			expect(routeMaterialInteraction).toHaveBeenCalledWith(mockInteraction);
		});

		it('should handle complex subcategory names', async () => {
			mockInteraction.customId = 'logistics_select_subcategory-infantry_weapons-small_arms';

			await subcategoryHandler.execute(mockInteraction);

			expect(routeMaterialInteraction).toHaveBeenCalledWith(mockInteraction);
		});
	});

	describe('Handler ID Resolution', () => {
		it('should have unique IDs for each handler', () => {
			expect(categoryHandler.id).not.toBe(subcategoryHandler.id);
		});

		it('should use consistent ID prefixes', () => {
			expect(categoryHandler.id).toContain('logistics_select');
			expect(subcategoryHandler.id).toContain('logistics_select');
		});
	});

	describe('Integration with Discord.js button system', () => {
		it('should work with split-based ID resolution', () => {
			// Simule le comportement de buttonInteraction.js
			const testId = 'logistics_select_category-utilities';
			const parts = testId.split('-');
			const handlerId = parts[0];

			expect(handlerId).toBe('logistics_select_category');
			expect(handlerId).toBe(categoryHandler.id);
		});

		it('should parse category key correctly', () => {
			const testId = 'logistics_select_category-infantry_weapons';
			const parts = testId.split('-');

			expect(parts[0]).toBe('logistics_select_category');
			expect(parts[1]).toBe('infantry_weapons');
		});

		it('should parse subcategory keys correctly', () => {
			const testId = 'logistics_select_subcategory-utilities-field_equipment';
			const parts = testId.split('-');

			expect(parts[0]).toBe('logistics_select_subcategory');
			expect(parts[1]).toBe('utilities');
			expect(parts[2]).toBe('field_equipment');
		});
	});

	describe('Error Handling', () => {
		it('should propagate errors from routeMaterialInteraction', async () => {
			const error = new Error('Test error');
			routeMaterialInteraction.mockRejectedValueOnce(error);

			mockInteraction.customId = 'logistics_select_category-utilities';

			await expect(categoryHandler.execute(mockInteraction)).rejects.toThrow('Test error');
		});
	});
});
