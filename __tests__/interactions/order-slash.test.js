const mockTranslate = jest.fn((key) => key);

jest.mock('../../utils/translations.js', () => jest.fn().mockImplementation(() => ({ translate: mockTranslate })));

jest.mock('../../utils/markdown.js', () => ({
	safeEscapeMarkdown: (s) => s,
}));

jest.mock('../../utils/order-permissions.js', () => ({
	canManageBoard: jest.fn(),
}));

const mockCreateBoard = jest.fn();
const mockDeleteBoard = jest.fn();
const mockFindBoard = jest.fn();

jest.mock('../../services/order/index.js', () => ({
	createBoard: (...args) => mockCreateBoard(...args),
	deleteBoard: (...args) => mockDeleteBoard(...args),
	findBoardByChannelAndName: (...args) => mockFindBoard(...args),
}));

const mockOperationFindOne = jest.fn();
jest.mock('../../data/models.js', () => ({
	Operation: { findOne: (...args) => mockOperationFindOne(...args) },
}));

const { canManageBoard } = require('../../utils/order-permissions.js');
const orderCommand = require('../../interactions/slash/order/order.js');

describe('Slash /order', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		mockTranslate.mockImplementation((key) => key);
	});

	function interaction(subcommand, { strings = {}, userId = 'u1' } = {}) {
		return {
			client: { traductions: new Map() },
			guild: { id: 'g1' },
			channel: { id: 'c1' },
			user: { id: userId },
			options: {
				getSubcommand: () => subcommand,
				getString: (name) => (Object.prototype.hasOwnProperty.call(strings, name) ? strings[name] : null),
			},
			reply: jest.fn().mockResolvedValue(undefined),
			deferReply: jest.fn().mockResolvedValue(undefined),
			editReply: jest.fn().mockResolvedValue(undefined),
			deleteReply: jest.fn().mockResolvedValue(undefined),
			member: { permissions: { has: () => false }, permissionsIn: () => ({ has: () => false }) },
		};
	}

	describe('create', () => {
		it('crée un board prod', async () => {
			mockCreateBoard.mockResolvedValue({ name: 'OP', kind: 'prod' });
			const i = interaction('create', { strings: { name: 'OP', type: 'prod' } });
			await orderCommand.execute(i);
			expect(mockCreateBoard).toHaveBeenCalledWith(expect.objectContaining({
				guildId: 'g1',
				channelId: 'c1',
				name: 'OP',
				kind: 'prod',
				operationId: null,
			}));
			expect(i.deferReply).toHaveBeenCalledWith({ flags: 64 });
			expect(i.deleteReply).toHaveBeenCalled();
			expect(i.reply).not.toHaveBeenCalled();
		});

		it('refuse nom vide', async () => {
			const i = interaction('create', { strings: { name: '   ', type: 'prod' } });
			await orderCommand.execute(i);
			expect(mockCreateBoard).not.toHaveBeenCalled();
			expect(i.reply).toHaveBeenCalledWith(expect.objectContaining({ content: 'ORDER_INVALID_NAME' }));
		});

		it('refuse opération inexistante', async () => {
			mockOperationFindOne.mockResolvedValue(null);
			const i = interaction('create', {
				strings: { name: 'OP', type: 'transfer', operation: 'missing' },
			});
			await orderCommand.execute(i);
			expect(mockCreateBoard).not.toHaveBeenCalled();
			expect(i.reply).toHaveBeenCalledWith(expect.objectContaining({ content: 'OPERATION_NOT_EXIST' }));
		});

		it('gère ORDER_ALREADY_EXISTS', async () => {
			const err = new Error('dup');
			err.code = 'ORDER_ALREADY_EXISTS';
			mockCreateBoard.mockRejectedValue(err);
			const i = interaction('create', { strings: { name: 'OP', type: 'prod' } });
			await orderCommand.execute(i);
			expect(i.editReply).toHaveBeenCalledWith(expect.objectContaining({ content: 'ORDER_ALREADY_EXISTS' }));
		});

		it('refuse opération terminée', async () => {
			mockOperationFindOne.mockResolvedValue({ operation_id: 'op1', status: 'finished' });
			const i = interaction('create', {
				strings: { name: 'OP', type: 'prod', operation: 'op1' },
			});
			await orderCommand.execute(i);
			expect(mockCreateBoard).not.toHaveBeenCalled();
			expect(i.reply).toHaveBeenCalledWith(expect.objectContaining({
				content: 'ORDER_OPERATION_FINISHED',
			}));
		});

		it('propage les erreurs non gérées', async () => {
			mockCreateBoard.mockRejectedValue(new Error('boom'));
			const i = interaction('create', { strings: { name: 'OP', type: 'prod' } });
			await expect(orderCommand.execute(i)).rejects.toThrow('boom');
		});

		it('ignore échec deleteReply après create', async () => {
			mockCreateBoard.mockResolvedValue({ name: 'OP' });
			const i = interaction('create', { strings: { name: 'OP', type: 'prod' } });
			i.deleteReply.mockRejectedValue(new Error('unknown message'));
			await expect(orderCommand.execute(i)).resolves.toBeUndefined();
		});

		it('passe operation_id si op valide', async () => {
			mockOperationFindOne.mockResolvedValue({ operation_id: 'op1', title: 'Raid', status: 'started' });
			mockCreateBoard.mockResolvedValue({ name: 'OP', kind: 'prod' });
			const i = interaction('create', {
				strings: { name: 'OP', type: 'prod', operation: 'op1' },
			});
			await orderCommand.execute(i);
			expect(mockCreateBoard).toHaveBeenCalledWith(expect.objectContaining({ operationId: 'op1' }));
		});
	});

	describe('remove', () => {
		it('refuse nom vide', async () => {
			const i = interaction('remove', { strings: { name: '  ' } });
			await orderCommand.execute(i);
			expect(mockDeleteBoard).not.toHaveBeenCalled();
			expect(i.reply).toHaveBeenCalledWith(expect.objectContaining({ content: 'ORDER_INVALID_NAME' }));
		});

		it('supprime si board trouvé et permission ok', async () => {
			const board = { _id: 'b1', name: 'OP', owner_id: 'u1' };
			mockFindBoard.mockResolvedValue(board);
			canManageBoard.mockReturnValue(true);
			mockDeleteBoard.mockResolvedValue(board);
			const i = interaction('remove', { strings: { name: 'OP' } });
			await orderCommand.execute(i);
			expect(mockDeleteBoard).toHaveBeenCalledWith(board, i.channel, i.client);
			expect(i.deferReply).toHaveBeenCalledWith({ flags: 64 });
			expect(i.deleteReply).toHaveBeenCalled();
			expect(i.reply).not.toHaveBeenCalled();
		});

		it('ignore échec deleteReply après remove', async () => {
			mockFindBoard.mockResolvedValue({ _id: 'b1', name: 'OP', owner_id: 'u1' });
			canManageBoard.mockReturnValue(true);
			mockDeleteBoard.mockResolvedValue({});
			const i = interaction('remove', { strings: { name: 'OP' } });
			i.deleteReply.mockRejectedValue(new Error('unknown message'));
			await expect(orderCommand.execute(i)).resolves.toBeUndefined();
		});

		it('ORDER_NOT_EXIST si absent', async () => {
			mockFindBoard.mockResolvedValue(null);
			const i = interaction('remove', { strings: { name: 'Nope' } });
			await orderCommand.execute(i);
			expect(mockDeleteBoard).not.toHaveBeenCalled();
			expect(i.reply).toHaveBeenCalledWith(expect.objectContaining({ content: 'ORDER_NOT_EXIST' }));
		});

		it('refuse sans permission', async () => {
			mockFindBoard.mockResolvedValue({ name: 'OP', owner_id: 'other' });
			canManageBoard.mockReturnValue(false);
			const i = interaction('remove', { strings: { name: 'OP' } });
			await orderCommand.execute(i);
			expect(mockDeleteBoard).not.toHaveBeenCalled();
			expect(i.reply).toHaveBeenCalledWith(expect.objectContaining({
				content: 'ORDER_CANNOT_MANAGE_ERROR',
			}));
		});
	});

	it('expose data.name order', () => {
		expect(orderCommand.data.name).toBe('order');
	});
});
