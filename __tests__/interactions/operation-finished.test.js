const mockTranslate = jest.fn((key) => key);

jest.mock('../../utils/translations.js', () => jest.fn().mockImplementation(() => ({ translate: mockTranslate })));

const mockOperationFindOne = jest.fn();
const mockOperationUpdateOne = jest.fn().mockResolvedValue({});
const mockDeleteBoardsByOperation = jest.fn().mockResolvedValue([]);

jest.mock('../../data/models.js', () => ({
	Operation: {
		findOne: (...args) => mockOperationFindOne(...args),
		updateOne: (...args) => mockOperationUpdateOne(...args),
	},
}));

jest.mock('../../services/order/index.js', () => ({
	deleteBoardsByOperation: (...args) => mockDeleteBoardsByOperation(...args),
}));

const finishedHandler = require('../../interactions/buttons/operation/finished.js');

describe('Operation finished button', () => {
	let interaction;

	beforeEach(() => {
		jest.clearAllMocks();

		interaction = {
			client: { traductions: new Map() },
			guild: { id: 'guild-1' },
			user: { id: 'owner-1' },
			message: { id: 'op-msg-1' },
			update: jest.fn().mockResolvedValue(undefined),
			reply: jest.fn().mockResolvedValue(undefined),
		};
	});

	it('termine l’opération et supprime les boards liés', async () => {
		mockOperationFindOne.mockResolvedValue({
			owner_id: 'owner-1',
			title: 'Op Test',
			date: '01/01/2026',
			time: '20:00',
			duration: 60,
			description: 'Raid',
		});

		await finishedHandler.execute(interaction);

		expect(mockDeleteBoardsByOperation).toHaveBeenCalledWith(
			'guild-1',
			'op-msg-1',
			interaction.client,
		);
		expect(mockOperationUpdateOne).toHaveBeenCalledWith(
			{ guild_id: 'guild-1', operation_id: 'op-msg-1' },
			{ status: 'finished' },
		);
		expect(interaction.update).toHaveBeenCalledWith(
			expect.objectContaining({
				content: expect.stringContaining('OPERATION_FINISHED_SUCCESS'),
				components: [],
			}),
		);
	});

	it('refuse si pas owner', async () => {
		mockOperationFindOne.mockResolvedValue({ owner_id: 'other', title: 'Op' });
		await finishedHandler.execute(interaction);
		expect(mockDeleteBoardsByOperation).not.toHaveBeenCalled();
		expect(interaction.reply).toHaveBeenCalledWith(
			expect.objectContaining({ content: 'OPERATION_ARE_NO_OWNER_ERROR', flags: 64 }),
		);
	});

	it('répond NOT_EXIST si opération introuvable', async () => {
		mockOperationFindOne.mockResolvedValue(null);
		await finishedHandler.execute(interaction);
		expect(interaction.reply).toHaveBeenCalledWith(
			expect.objectContaining({ content: 'OPERATION_NOT_EXIST', flags: 64 }),
		);
	});

	it('répond FINISHED_ERROR si une erreur survient', async () => {
		mockOperationFindOne.mockResolvedValue({
			owner_id: 'owner-1',
			title: 'Op Test',
			date: '01/01/2026',
			time: '20:00',
			duration: 60,
			description: 'Raid',
		});
		mockDeleteBoardsByOperation.mockRejectedValue(new Error('delete failed'));
		const err = jest.spyOn(console, 'error').mockImplementation(() => undefined);

		await finishedHandler.execute(interaction);

		err.mockRestore();
		expect(interaction.reply).toHaveBeenCalledWith(
			expect.objectContaining({ content: 'OPERATION_FINISHED_ERROR', flags: 64 }),
		);
	});
});
