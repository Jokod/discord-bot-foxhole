const mockTranslate = jest.fn((key, params) => (params ? `${key}_${JSON.stringify(params)}` : key));

jest.mock('../../utils/translations.js', () => jest.fn().mockImplementation(() => ({ translate: mockTranslate })));

const mockResetServerWarData = jest.fn().mockResolvedValue({ boards: 1, stockpiles: 2, operations: 3 });
jest.mock('../../utils/serverReset.js', () => ({
	resetServerWarData: (...args) => mockResetServerWarData(...args),
}));

const confirmHandler = require('../../interactions/buttons/server/reset_confirm.js');
const cancelHandler = require('../../interactions/buttons/server/reset_cancel.js');

describe('Server reset buttons', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		mockResetServerWarData.mockResolvedValue({ boards: 1, stockpiles: 2, operations: 3 });
	});

	function createInteraction(overrides = {}) {
		const guild = { id: 'guild-123' };
		return {
			client: { traductions: new Map() },
			guild,
			member: {
				permissions: {
					has: jest.fn().mockReturnValue(overrides.canManage !== false),
				},
			},
			reply: jest.fn().mockResolvedValue(undefined),
			deferUpdate: jest.fn().mockResolvedValue(undefined),
			editReply: jest.fn().mockResolvedValue(undefined),
			update: jest.fn().mockResolvedValue(undefined),
			...overrides,
		};
	}

	it('confirm: refuse sans permission', async () => {
		const interaction = createInteraction({ canManage: false });
		await confirmHandler.execute(interaction);
		expect(mockResetServerWarData).not.toHaveBeenCalled();
		expect(interaction.reply).toHaveBeenCalledWith({
			content: 'NO_PERMS',
			flags: 64,
		});
	});

	it('confirm: exécute le wipe et retire les boutons', async () => {
		const interaction = createInteraction();
		await confirmHandler.execute(interaction);
		expect(interaction.deferUpdate).toHaveBeenCalled();
		expect(mockResetServerWarData).toHaveBeenCalledWith(interaction.client, 'guild-123');
		expect(interaction.editReply).toHaveBeenCalledWith({
			content: expect.stringContaining('SERVER_RESET_SUCCESS'),
			components: [],
		});
	});

	it('cancel: annule sans wipe', async () => {
		const interaction = createInteraction();
		await cancelHandler.execute(interaction);
		expect(mockResetServerWarData).not.toHaveBeenCalled();
		expect(interaction.update).toHaveBeenCalledWith({
			content: 'SERVER_RESET_CANCELLED',
			components: [],
		});
	});
});
