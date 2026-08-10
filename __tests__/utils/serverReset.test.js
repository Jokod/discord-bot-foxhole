jest.mock('../../data/models.js', () => ({
	OrderBoard: {
		find: jest.fn(),
		countDocuments: jest.fn(),
	},
	Operation: {
		find: jest.fn(),
		deleteMany: jest.fn(),
		countDocuments: jest.fn(),
	},
	Stockpile: {
		deleteMany: jest.fn(),
		countDocuments: jest.fn(),
	},
}));

const mockDeleteBoard = jest.fn().mockResolvedValue(undefined);
jest.mock('../../services/order/index.js', () => ({
	deleteBoard: (...args) => mockDeleteBoard(...args),
}));

const mockRefreshLists = jest.fn().mockResolvedValue(1);
jest.mock('../../utils/stockpileListSync.js', () => ({
	refreshTrackedStockpileLists: (...args) => mockRefreshLists(...args),
}));

const { OrderBoard, Operation, Stockpile } = require('../../data/models.js');
const { previewServerWarData, resetServerWarData } = require('../../utils/serverReset.js');

describe('serverReset', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('preview compte boards/stockpiles/operations', async () => {
		OrderBoard.countDocuments.mockResolvedValue(2);
		Stockpile.countDocuments.mockResolvedValue(4);
		Operation.countDocuments.mockResolvedValue(1);
		await expect(previewServerWarData('g1')).resolves.toEqual({
			boards: 2, stockpiles: 4, operations: 1,
		});
	});

	it('supprime boards (Discord), stockpiles et operations', async () => {
		OrderBoard.find.mockResolvedValue([
			{ _id: 'b1', channel_id: 'c1', guild_id: 'g1' },
			{ _id: 'b2', channel_id: 'c2', guild_id: 'g1' },
		]);
		Stockpile.deleteMany.mockResolvedValue({ deletedCount: 4 });
		Operation.find.mockReturnValue({
			lean: () => Promise.resolve([
				{ operation_id: 'm1', channel_id: 'c3' },
			]),
		});
		Operation.deleteMany.mockResolvedValue({ deletedCount: 1 });
		const msgDelete = jest.fn().mockResolvedValue(undefined);
		const fetch = jest.fn()
			.mockResolvedValueOnce({ id: 'c1' })
			.mockResolvedValueOnce({ id: 'c2' })
			.mockResolvedValueOnce({
				id: 'c3',
				isTextBased: () => true,
				messages: { fetch: jest.fn().mockResolvedValue({ delete: msgDelete }) },
			});
		const client = { channels: { fetch } };

		const counts = await resetServerWarData(client, 'g1');

		expect(mockDeleteBoard).toHaveBeenCalledTimes(2);
		expect(Stockpile.deleteMany).toHaveBeenCalledWith({ server_id: 'g1' });
		expect(Operation.deleteMany).toHaveBeenCalledWith({ guild_id: 'g1' });
		expect(msgDelete).toHaveBeenCalled();
		expect(mockRefreshLists).toHaveBeenCalledWith(client, { guildIds: ['g1'] });
		expect(counts).toEqual({ boards: 2, stockpiles: 4, operations: 1 });
	});

	it('retourne des zéros sans client/guild', async () => {
		await expect(resetServerWarData(null, 'g1')).resolves.toEqual({
			boards: 0, stockpiles: 0, operations: 0,
		});
		expect(OrderBoard.find).not.toHaveBeenCalled();
	});
});
