const mockUpdate = jest.fn().mockResolvedValue(undefined);
const mockTranslate = jest.fn((key) => key);
const mockActionRow = jest.fn().mockReturnValue([{ type: 1 }]);

jest.mock('../../utils/interaction/manage_material.js', () => class MockManageMaterial {
	actionRow() { return mockActionRow(); }
});
jest.mock('../../utils/translations.js', () => jest.fn().mockImplementation(() => ({ translate: mockTranslate })));
jest.mock('../../utils/material-priority.js', () => ({
	getPriorityTranslationKey: jest.fn((p) => p ? `MATERIAL_PRIORITY_${p.toUpperCase()}` : 'MATERIAL_PRIORITY_NEUTRAL'),
	getPriorityColoredText: jest.fn((p, label) => label),
}));

describe('ResponseMaterial', () => {
	let ResponseMaterial;

	beforeEach(() => {
		jest.clearAllMocks();
		ResponseMaterial = require('../../utils/interaction/response_material.js');
	});

	it(' appelle interaction.update avec le contenu formaté', async () => {
		const interaction = {
			client: {},
			guild: { id: 'guild-123' },
			update: mockUpdate,
		};
		const material = {
			owner_id: 'user-456',
			name: 'bmat',
			quantityAsk: 100,
			priority: 'neutral',
		};

		const response = new ResponseMaterial(interaction, material);
		await response.response();

		const updateCall = mockUpdate.mock.calls[0][0];
		expect(updateCall.content).toContain('Bmat');
		expect(updateCall.content).toContain('100');
		expect(updateCall.components).toBeDefined();
	});

	it('utilise NONE pour name si material.name absent', async () => {
		const interaction = {
			client: {},
			guild: { id: 'guild-123' },
			update: mockUpdate,
		};
		const material = {
			owner_id: 'user-456',
			quantityAsk: 50,
			priority: 'high',
		};

		const response = new ResponseMaterial(interaction, material);
		await response.response();

		expect(mockUpdate).toHaveBeenCalledWith(
			expect.objectContaining({
				content: expect.stringContaining('NONE'),
			}),
		);
	});
});
