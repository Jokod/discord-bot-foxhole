jest.mock('../../utils/translations.js', () => jest.fn().mockImplementation(() => ({
	translate: (key) => key,
})));

jest.mock('../../utils/orderBoardLog.js', () => ({
	createLogThread: jest.fn().mockResolvedValue({ id: 'th1' }),
	deleteOrderLogThread: jest.fn().mockResolvedValue(undefined),
}));

const mockSaveTracked = jest.fn().mockResolvedValue(undefined);
const mockEditTracked = jest.fn().mockResolvedValue({ usedFallback: false });
jest.mock('../../utils/trackedMessage.js', () => ({
	saveTrackedMessage: (...args) => mockSaveTracked(...args),
	editTrackedOrFallback: (...args) => mockEditTracked(...args),
}));

const mockFindById = jest.fn();
const mockFindOneAndUpdate = jest.fn();
const mockOrderLineFind = jest.fn();
const mockTrackedFind = jest.fn();
const mockTrackedDeleteMany = jest.fn();
const mockOpFindOne = jest.fn();

jest.mock('../../data/models.js', () => ({
	OrderBoard: {
		findById: (...args) => mockFindById(...args),
		findOneAndUpdate: (...args) => mockFindOneAndUpdate(...args),
		find: jest.fn(),
		updateOne: jest.fn().mockResolvedValue({}),
	},
	OrderLine: {
		find: (...args) => mockOrderLineFind(...args),
	},
	TrackedMessage: {
		find: (...args) => mockTrackedFind(...args),
		deleteMany: (...args) => mockTrackedDeleteMany(...args),
	},
	Operation: {
		findOne: (...args) => mockOpFindOne(...args),
	},
}));

const {
	allocateLineId,
	bootstrapOrderBoard,
	refreshOrderBoard,
	refreshOrderBoardDebounced,
	deleteOrderTrackedMessages,
} = require('../../utils/orderBoardSync.js');
const { OrderBoard } = require('../../data/models.js');

describe('orderBoardSync', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		mockOrderLineFind.mockReturnValue({
			lean: () => Promise.resolve([]),
		});
		mockOpFindOne.mockReturnValue({ lean: () => Promise.resolve(null) });
	});

	it('allocateLineId incrémente next_line_number', async () => {
		mockFindOneAndUpdate.mockResolvedValue({ next_line_number: 3 });
		await expect(allocateLineId('g1', 'b1')).resolves.toBe('3');
		expect(mockFindOneAndUpdate).toHaveBeenCalledWith(
			{ _id: 'b1', guild_id: 'g1' },
			{ $inc: { next_line_number: 1 } },
			{ returnDocument: 'after' },
		);
	});

	it('allocateLineId throw si board absent', async () => {
		mockFindOneAndUpdate.mockResolvedValue(null);
		await expect(allocateLineId('g1', 'missing')).rejects.toThrow(/not found/);
	});

	it('bootstrapOrderBoard envoie et tracke le message', async () => {
		const send = jest.fn().mockResolvedValue({ id: 'msg1' });
		const channel = { send, id: 'c1' };
		const board = { _id: 'b1', guild_id: 'g1', name: 'OP', kind: 'prod', status: 'open', page: 0 };
		const client = { traductions: new Map() };

		await bootstrapOrderBoard(channel, client, board);

		expect(send).toHaveBeenCalledWith(expect.objectContaining({
			embeds: expect.any(Array),
			components: expect.any(Array),
		}));
		expect(mockSaveTracked).toHaveBeenCalledWith(
			'g1',
			'c1',
			'msg1',
			'order_board:b1',
			expect.anything(),
		);
	});

	it('refreshOrderBoard édite le message tracké', async () => {
		const board = {
			_id: 'b1',
			guild_id: 'g1',
			channel_id: 'c1',
			name: 'OP',
			kind: 'transfer',
			status: 'open',
			page: 0,
		};
		mockFindById.mockResolvedValue(board);
		const channel = { id: 'c1', isTextBased: () => true };
		const client = { traductions: new Map(), channels: { fetch: jest.fn() } };

		const ok = await refreshOrderBoard(client, board, channel);
		expect(ok).toBe(true);
		expect(mockEditTracked).toHaveBeenCalledWith(expect.objectContaining({
			messageType: 'order_board:b1',
			channel,
		}));
	});

	it('refreshOrderBoard retourne false si board absent', async () => {
		mockFindById.mockResolvedValue(null);
		const ok = await refreshOrderBoard({}, { _id: 'x', guild_id: 'g1' });
		expect(ok).toBe(false);
	});

	it('deleteOrderTrackedMessages fetch+delete puis purge DB', async () => {
		mockTrackedFind.mockReturnValue({
			lean: () => Promise.resolve([
				{ message_id: 'm1', channel_id: 'c1' },
			]),
		});
		mockTrackedDeleteMany.mockResolvedValue({});
		const msgDelete = jest.fn().mockResolvedValue(undefined);
		const channel = {
			id: 'c1',
			isTextBased: () => true,
			client: {},
			messages: {
				fetch: jest.fn().mockResolvedValue({ delete: msgDelete }),
			},
		};

		await deleteOrderTrackedMessages('g1', 'b1', channel);

		expect(msgDelete).toHaveBeenCalled();
		expect(mockTrackedDeleteMany).toHaveBeenCalledWith({
			server_id: 'g1',
			message_type: { $in: ['order_board:b1'] },
		});
	});

	it('refreshOrderBoardDebounced résout false si supersédé', async () => {
		jest.useFakeTimers();
		const board = { _id: 'b1', guild_id: 'g1', channel_id: 'c1', name: 'OP', kind: 'prod', status: 'open' };
		mockFindById.mockResolvedValue(board);
		const channel = { id: 'c1', isTextBased: () => true };
		const client = { traductions: new Map() };

		const first = refreshOrderBoardDebounced(client, board, channel);
		const second = refreshOrderBoardDebounced(client, board, channel);
		await jest.runAllTimersAsync();
		await expect(first).resolves.toBe(false);
		await expect(second).resolves.toBe(true);
		jest.useRealTimers();
	});
});
