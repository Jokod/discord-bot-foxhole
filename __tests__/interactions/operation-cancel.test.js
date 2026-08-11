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
		mockDeleteBoardsByOperation.mockResolvedValue([]);

		interaction = {
			client: { traductions: new Map() },
			guild: { id: 'guild-1' },
			user: { id: 'owner-1' },
			message: { id: 'op-msg-1', delete: jest.fn().mockResolvedValue(undefined) },
			deferReply: jest.fn().mockImplementation(async () => {
				interaction.deferred = true;
			}),
			editReply: jest.fn().mockResolvedValue(undefined),
			reply: jest.fn().mockResolvedValue(undefined),
			replied: false,
			deferred: false,
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

	it('répond CANCELED_ERROR si une erreur survient avant defer', async () => {
		mockOperationFindOne.mockRejectedValue(new Error('db down'));
		const err = jest.spyOn(console, 'error').mockImplementation(() => undefined);

		await cancelHandler.execute(interaction);

		err.mockRestore();
		expect(interaction.reply).toHaveBeenCalledWith(
			expect.objectContaining({ content: 'OPERATION_CANCELED_ERROR', flags: 64 }),
		);
	});

	it('editReply CANCELED_ERROR si erreur après defer', async () => {
		mockOperationFindOne.mockResolvedValue({ owner_id: 'owner-1', title: 'Op Test' });
		mockDeleteBoardsByOperation.mockRejectedValue(new Error('delete failed'));
		const err = jest.spyOn(console, 'error').mockImplementation(() => undefined);

		await cancelHandler.execute(interaction);

		err.mockRestore();
		expect(interaction.deferReply).toHaveBeenCalled();
		expect(interaction.editReply).toHaveBeenCalledWith(
			expect.objectContaining({ content: 'OPERATION_CANCELED_ERROR' }),
		);
	});

	it('ignore message.delete rejeté', async () => {
		mockOperationFindOne.mockResolvedValue({ owner_id: 'owner-1', title: 'Op Test' });
		interaction.message.delete.mockRejectedValueOnce(new Error('delete msg failed'));
		const err = jest.spyOn(console, 'error').mockImplementation(() => undefined);

		await cancelHandler.execute(interaction);

		err.mockRestore();
		expect(interaction.editReply).toHaveBeenCalledWith(
			expect.objectContaining({ content: 'OPERATION_CANCELED_SUCCESS' }),
		);
	});
});
