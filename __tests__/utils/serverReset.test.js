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

	it('preview sans guildId retourne des zéros', async () => {
		await expect(previewServerWarData('')).resolves.toEqual({
			boards: 0, stockpiles: 0, operations: 0,
		});
		expect(OrderBoard.countDocuments).not.toHaveBeenCalled();
	});

	it('board sans channel_id et ops incomplètes / fetch fail', async () => {
		OrderBoard.find.mockResolvedValue([
			{ _id: 'b1', guild_id: 'g1' },
		]);
		Stockpile.deleteMany.mockResolvedValue({ deletedCount: 0 });
		Operation.find.mockReturnValue({
			lean: () => Promise.resolve([
				{ operation_id: 'm1' },
				{ operation_id: 'm2', channel_id: 'c-missing' },
				{ operation_id: 'm3', channel_id: 'c-bad' },
			]),
		});
		Operation.deleteMany.mockResolvedValue({ deletedCount: 3 });
		const fetch = jest.fn()
			.mockRejectedValueOnce(new Error('missing'))
			.mockResolvedValueOnce({
				id: 'c-bad',
				isTextBased: () => false,
			});
		const client = { channels: { fetch } };

		const counts = await resetServerWarData(client, 'g1');

		expect(mockDeleteBoard).toHaveBeenCalledWith(
			expect.objectContaining({ _id: 'b1' }),
			null,
			client,
		);
		expect(counts).toEqual({ boards: 1, stockpiles: 0, operations: 3 });
	});

	it('ignore les erreurs de delete message opération', async () => {
		OrderBoard.find.mockResolvedValue([]);
		Stockpile.deleteMany.mockResolvedValue({ deletedCount: 0 });
		Operation.find.mockReturnValue({
			lean: () => Promise.resolve([
				{ operation_id: 'm1', channel_id: 'c1' },
			]),
		});
		Operation.deleteMany.mockResolvedValue({ deletedCount: 1 });
		const fetch = jest.fn().mockResolvedValue({
			id: 'c1',
			isTextBased: () => true,
			messages: {
				fetch: jest.fn().mockResolvedValue({
					delete: jest.fn().mockRejectedValue(new Error('gone')),
				}),
			},
		});
		const client = { channels: { fetch } };

		await expect(resetServerWarData(client, 'g1')).resolves.toEqual({
			boards: 0, stockpiles: 0, operations: 1,
		});
	});

	it('supprime message opération si fetch message null', async () => {
		OrderBoard.find.mockResolvedValue([]);
		Stockpile.deleteMany.mockResolvedValue({ deletedCount: 0 });
		Operation.find.mockReturnValue({
			lean: () => Promise.resolve([{ operation_id: 'm1', channel_id: 'c1' }]),
		});
		Operation.deleteMany.mockResolvedValue({ deletedCount: 1 });
		const fetch = jest.fn().mockResolvedValue({
			id: 'c1',
			isTextBased: () => true,
			messages: { fetch: jest.fn().mockResolvedValue(null) },
		});
		const client = { channels: { fetch } };

		await expect(resetServerWarData(client, 'g1')).resolves.toEqual({
			boards: 0, stockpiles: 0, operations: 1,
		});
	});

	it('ignore erreur refreshTrackedStockpileLists', async () => {
		mockRefreshLists.mockRejectedValueOnce(new Error('sync fail'));
		OrderBoard.find.mockResolvedValue([]);
		Stockpile.deleteMany.mockResolvedValue({});
		Operation.find.mockReturnValue({ lean: () => Promise.resolve([]) });
		Operation.deleteMany.mockResolvedValue({ deletedCount: 0 });
		const client = { channels: { fetch: jest.fn() } };

		await expect(resetServerWarData(client, 'g1')).resolves.toEqual({
			boards: 0, stockpiles: 0, operations: 0,
		});
	});

	it('catch best-effort sur erreur fetch channel opération', async () => {
		OrderBoard.find.mockResolvedValue([]);
		Stockpile.deleteMany.mockResolvedValue({});
		Operation.find.mockReturnValue({
			lean: () => Promise.resolve([{ operation_id: 'm1', channel_id: 'c1' }]),
		});
		Operation.deleteMany.mockResolvedValue({ deletedCount: 1 });
		const fetch = jest.fn().mockImplementation(() => {
			throw new Error('discord down');
		});
		const client = { channels: { fetch } };

		await expect(resetServerWarData(client, 'g1')).resolves.toEqual({
			boards: 0, stockpiles: 0, operations: 1,
		});
	});

	it('operation messages.fetch reject utilise catch null', async () => {
		OrderBoard.find.mockResolvedValue([]);
		Stockpile.deleteMany.mockResolvedValue({ deletedCount: 0 });
		Operation.find.mockReturnValue({
			lean: () => Promise.resolve([{ operation_id: 'm1', channel_id: 'c1' }]),
		});
		Operation.deleteMany.mockResolvedValue({ deletedCount: 1 });
		const fetch = jest.fn().mockResolvedValue({
			id: 'c1',
			isTextBased: () => true,
			messages: {
				fetch: jest.fn().mockReturnValue(Promise.reject(new Error('msg fetch fail'))),
			},
		});
		const client = { channels: { fetch } };

		await expect(resetServerWarData(client, 'g1')).resolves.toEqual({
			boards: 0, stockpiles: 0, operations: 1,
		});
	});

	it('board fetch channel reject utilise catch null', async () => {
		OrderBoard.find.mockResolvedValue([
			{ _id: 'b1', channel_id: 'c1', guild_id: 'g1' },
		]);
		Stockpile.deleteMany.mockResolvedValue({ deletedCount: 0 });
		Operation.find.mockReturnValue({ lean: () => Promise.resolve([]) });
		Operation.deleteMany.mockResolvedValue({ deletedCount: 0 });
		const client = {
			channels: {
				fetch: jest.fn().mockReturnValue(Promise.reject(new Error('missing channel'))),
			},
		};

		await expect(resetServerWarData(client, 'g1')).resolves.toEqual({
			boards: 1, stockpiles: 0, operations: 0,
		});
		expect(mockDeleteBoard).toHaveBeenCalledWith(
			expect.objectContaining({ _id: 'b1' }),
			null,
			client,
		);
	});

	it('msg.delete reject est ignoré via catch', async () => {
		OrderBoard.find.mockResolvedValue([]);
		Stockpile.deleteMany.mockResolvedValue({ deletedCount: 0 });
		Operation.find.mockReturnValue({
			lean: () => Promise.resolve([{ operation_id: 'm1', channel_id: 'c1' }]),
		});
		Operation.deleteMany.mockResolvedValue({ deletedCount: 1 });
		const fetch = jest.fn().mockResolvedValue({
			id: 'c1',
			isTextBased: () => true,
			messages: {
				fetch: jest.fn().mockResolvedValue({
					delete: jest.fn().mockReturnValue(Promise.reject(new Error('cannot delete'))),
				}),
			},
		});
		const client = { channels: { fetch } };

		await expect(resetServerWarData(client, 'g1')).resolves.toEqual({
			boards: 0, stockpiles: 0, operations: 1,
		});
	});

	it('stockpile deletedCount null utilise fallback 0', async () => {
		OrderBoard.find.mockResolvedValue([]);
		Stockpile.deleteMany.mockResolvedValue({});
		Operation.find.mockReturnValue({ lean: () => Promise.resolve([]) });
		Operation.deleteMany.mockResolvedValue({});
		const client = { channels: { fetch: jest.fn() } };

		await expect(resetServerWarData(client, 'g1')).resolves.toEqual({
			boards: 0, stockpiles: 0, operations: 0,
		});
	});

	it('ignore refreshTrackedStockpileLists en échec', async () => {
		OrderBoard.find.mockResolvedValue([]);
		Stockpile.deleteMany.mockResolvedValue({ deletedCount: 1 });
		Operation.find.mockReturnValue({ lean: () => Promise.resolve([]) });
		Operation.deleteMany.mockResolvedValue({ deletedCount: 0 });
		mockRefreshLists.mockRejectedValueOnce(new Error('refresh fail'));
		const client = { channels: { fetch: jest.fn() } };

		await expect(resetServerWarData(client, 'g1')).resolves.toEqual({
			boards: 0, stockpiles: 1, operations: 0,
		});
	});

	it('ignore erreur externe dans boucle operations', async () => {
		OrderBoard.find.mockResolvedValue([]);
		Stockpile.deleteMany.mockResolvedValue({ deletedCount: 0 });
		Operation.find.mockReturnValue({
			lean: () => Promise.resolve([{ operation_id: 'm1', channel_id: 'c1' }]),
		});
		Operation.deleteMany.mockResolvedValue({ deletedCount: 1 });
		const fetch = jest.fn().mockImplementation(() => {
			throw new Error('unexpected');
		});
		const client = { channels: { fetch } };

		await expect(resetServerWarData(client, 'g1')).resolves.toEqual({
			boards: 0, stockpiles: 0, operations: 1,
		});
	});

	it('refreshTrackedStockpileLists catch callback retourne 0', async () => {
		mockRefreshLists.mockRejectedValueOnce(new Error('sync fail'));
		OrderBoard.find.mockResolvedValue([]);
		Stockpile.deleteMany.mockResolvedValue({ deletedCount: 0 });
		Operation.find.mockReturnValue({ lean: () => Promise.resolve([]) });
		Operation.deleteMany.mockResolvedValue({ deletedCount: 0 });
		await expect(resetServerWarData({ channels: { fetch: jest.fn() } }, 'g1')).resolves.toEqual({
			boards: 0, stockpiles: 0, operations: 0,
		});
	});
});
