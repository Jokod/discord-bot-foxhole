const mockTranslate = jest.fn((key) => key);

jest.mock('../../utils/translations.js', () => jest.fn().mockImplementation(() => ({ translate: mockTranslate })));

const mockOperationFindOne = jest.fn();
const mockOperationDeleteOne = jest.fn().mockResolvedValue({});
const mockDeleteBoardsByOperation = jest.fn().mockResolvedValue([]);

jest.mock('../../data/models.js', () => ({
	Operation: {
		findOne: (...args) => mockOperationFindOne(...args),
		deleteOne: (...args) => mockOperationDeleteOne(...args),
	},
}));

jest.mock('../../services/order/index.js', () => ({
	deleteBoardsByOperation: (...args) => mockDeleteBoardsByOperation(...args),
}));

const cancelHandler = require('../../interactions/buttons/operation/cancel.js');

describe('Operation cancel button', () => {
	let interaction;

	beforeEach(() => {
		jest.clearAllMocks();

		interaction = {
			client: { traductions: new Map() },
			guild: { id: 'guild-1' },
			user: { id: 'owner-1' },
			message: { id: 'op-msg-1', delete: jest.fn().mockResolvedValue(undefined) },
			deferReply: jest.fn().mockResolvedValue(undefined),
			editReply: jest.fn().mockResolvedValue(undefined),
			reply: jest.fn().mockResolvedValue(undefined),
		};
	});

	it('supprime l’opération, les boards liés et le message si le créateur annule', async () => {
		mockOperationFindOne.mockResolvedValue({
			owner_id: 'owner-1',
			title: 'Op Test',
		});

		await cancelHandler.execute(interaction);

		expect(mockOperationFindOne).toHaveBeenCalledWith({
			guild_id: 'guild-1',
			operation_id: 'op-msg-1',
		});
		expect(interaction.deferReply).toHaveBeenCalledWith({ flags: 64 });
		expect(mockDeleteBoardsByOperation).toHaveBeenCalledWith(
			'guild-1',
			'op-msg-1',
			interaction.client,
		);
		expect(mockOperationDeleteOne).toHaveBeenCalledWith({
			guild_id: 'guild-1',
			operation_id: 'op-msg-1',
		});
		expect(interaction.message.delete).toHaveBeenCalled();
		expect(interaction.editReply).toHaveBeenCalledWith(
			expect.objectContaining({ content: 'OPERATION_CANCELED_SUCCESS' }),
		);
	});

	it('refuse si l’utilisateur n’est pas le créateur', async () => {
		mockOperationFindOne.mockResolvedValue({
			owner_id: 'other-owner',
			title: 'Op Test',
		});

		await cancelHandler.execute(interaction);

		expect(mockDeleteBoardsByOperation).not.toHaveBeenCalled();
		expect(mockOperationDeleteOne).not.toHaveBeenCalled();
		expect(interaction.reply).toHaveBeenCalledWith(
			expect.objectContaining({ content: 'OPERATION_ARE_NO_OWNER_ERROR', flags: 64 }),
		);
	});

	it('répond NOT_EXIST si l’opération est introuvable', async () => {
		mockOperationFindOne.mockResolvedValue(null);

		await cancelHandler.execute(interaction);

		expect(mockDeleteBoardsByOperation).not.toHaveBeenCalled();
		expect(mockOperationDeleteOne).not.toHaveBeenCalled();
		expect(interaction.reply).toHaveBeenCalledWith(
			expect.objectContaining({ content: 'OPERATION_NOT_EXIST', flags: 64 }),
		);
	});
});
