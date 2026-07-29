jest.mock('../../data/models.js', () => ({
	OrderBoard: {
		findOne: jest.fn(),
		find: jest.fn(),
		findOneAndUpdate: jest.fn(),
		create: jest.fn(),
		deleteOne: jest.fn(),
		updateOne: jest.fn(),
	},
	OrderLine: {
		findOne: jest.fn(),
		findOneAndUpdate: jest.fn(),
		find: jest.fn(),
		create: jest.fn(),
		deleteMany: jest.fn(),
		deleteOne: jest.fn(),
		countDocuments: jest.fn().mockResolvedValue(0),
	},
	Operation: { findOne: jest.fn() },
	TrackedMessage: {
		find: jest.fn(),
		deleteMany: jest.fn(),
	},
}));

const mockBootstrap = jest.fn().mockResolvedValue({});
const mockDeleteTracked = jest.fn().mockResolvedValue(undefined);
const mockAllocate = jest.fn().mockResolvedValue('7');
const mockDeleteOrderLogThread = jest.fn().mockResolvedValue(undefined);

jest.mock('../../utils/orderBoardSync.js', () => ({
	allocateLineId: (...args) => mockAllocate(...args),
	bootstrapOrderBoard: (...args) => mockBootstrap(...args),
	refreshOrderBoard: jest.fn().mockResolvedValue(true),
	refreshOrderBoardDebounced: jest.fn().mockResolvedValue(true),
	deleteOrderTrackedMessages: (...args) => mockDeleteTracked(...args),
}));

jest.mock('../../utils/orderBoardLog.js', () => ({
	deleteOrderLogThread: (...args) => mockDeleteOrderLogThread(...args),
}));

const { OrderBoard, OrderLine } = require('../../data/models.js');
const {
	QTY_DELTAS,
	createBoard,
	deleteBoard,
	deleteBoardsByOperation,
	closeBoard,
	reopenBoard,
	setSelectedLine,
	applyIncrement,
	fillToTarget,
	cycleLinePriority,
	correctLine,
	deleteLine,
	createLine,
	setDraft,
	getDraft,
	consumeDraft,
	findBoardById,
	findBoardByChannelAndName,
	findBoardsByChannel,
	listLines,
	sortLines,
} = require('../../services/order/index.js');

describe('services/order', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('exposes qty deltas', () => {
		expect(QTY_DELTAS).toEqual({ m1: -1, p1: 1, p4: 4, p9: 9 });
	});

	describe('createBoard', () => {
		it('crée le board et bootstrap Discord', async () => {
			OrderBoard.findOne.mockResolvedValue(null);
			const created = { _id: 'b1', name: 'OP' };
			OrderBoard.create.mockResolvedValue(created);
			const channel = { id: 'c1' };
			const client = {};

			const board = await createBoard({
				guildId: 'g1',
				channelId: 'c1',
				ownerId: 'u1',
				name: 'OP',
				kind: 'prod',
				client,
				channel,
			});

			expect(OrderBoard.create).toHaveBeenCalledWith(expect.objectContaining({
				guild_id: 'g1',
				kind: 'prod',
				name: 'OP',
				operation_id: null,
			}));
			expect(mockBootstrap).toHaveBeenCalledWith(channel, client, created);
			expect(board).toBe(created);
		});

		it('refuse un doublon de nom', async () => {
			OrderBoard.findOne.mockResolvedValue({ _id: 'existing' });
			await expect(createBoard({
				guildId: 'g1',
				channelId: 'c1',
				ownerId: 'u1',
				name: 'OP',
				kind: 'transfer',
			})).rejects.toMatchObject({ code: 'ORDER_ALREADY_EXISTS' });
			expect(OrderBoard.create).not.toHaveBeenCalled();
		});
	});

	describe('deleteBoard', () => {
		it('supprime lignes, messages trackés, thread logs et board', async () => {
			const board = { _id: 'b1', guild_id: 'g1', log_thread_id: 'th1' };
			OrderLine.deleteMany.mockResolvedValue({});
			OrderBoard.deleteOne.mockResolvedValue({});
			const channel = { id: 'c1' };
			const client = { channels: {} };

			await deleteBoard(board, channel, client);

			expect(OrderLine.deleteMany).toHaveBeenCalledWith({ guild_id: 'g1', board_id: 'b1' });
			expect(mockDeleteOrderLogThread).toHaveBeenCalledWith(client, board);
			expect(mockDeleteTracked).toHaveBeenCalledWith('g1', 'b1', channel, client);
			expect(OrderBoard.deleteOne).toHaveBeenCalledWith({ _id: 'b1' });
		});
	});

	describe('deleteBoardsByOperation', () => {
		it('supprime tous les boards liés à l’opération', async () => {
			OrderBoard.find.mockResolvedValue([
				{ _id: 'b1', guild_id: 'g1', channel_id: 'c1', operation_id: 'op1' },
				{ _id: 'b2', guild_id: 'g1', channel_id: 'c2', operation_id: 'op1' },
			]);
			OrderLine.deleteMany.mockResolvedValue({});
			OrderBoard.deleteOne.mockResolvedValue({});
			const fetch = jest.fn()
				.mockResolvedValueOnce({ id: 'c1' })
				.mockResolvedValueOnce({ id: 'c2' });
			const client = { channels: { fetch } };

			const deleted = await deleteBoardsByOperation('g1', 'op1', client);

			expect(OrderBoard.find).toHaveBeenCalledWith({
				guild_id: 'g1',
				operation_id: 'op1',
			});
			expect(deleted).toHaveLength(2);
			expect(mockDeleteTracked).toHaveBeenCalledTimes(2);
			expect(OrderBoard.deleteOne).toHaveBeenCalledTimes(2);
		});
	});

	it('closeBoard passe status closed', async () => {
		const save = jest.fn().mockResolvedValue(undefined);
		const board = { status: 'open', save };
		await closeBoard(board);
		expect(board.status).toBe('closed');
		expect(save).toHaveBeenCalled();
	});

	it('reopenBoard passe status open', async () => {
		const save = jest.fn().mockResolvedValue(undefined);
		const board = { status: 'closed', save };
		await reopenBoard(board);
		expect(board.status).toBe('open');
		expect(save).toHaveBeenCalled();
	});

	it('applyIncrement ajoute le delta et ignore ligne absente', async () => {
		OrderLine.findOneAndUpdate.mockResolvedValue({ current: 2, name: 'Sticky' });
		expect((await applyIncrement('g1', 'b1', '1', 4)).current).toBe(6);
		expect(OrderLine.findOneAndUpdate).toHaveBeenCalledWith(
			expect.any(Object),
			expect.any(Array),
			{ returnDocument: 'before', updatePipeline: true },
		);

		OrderLine.findOneAndUpdate.mockResolvedValue(null);
		expect(await applyIncrement('g1', 'b1', '9', 1)).toBeNull();
	});

	it('fillToTarget pose current = target', async () => {
		OrderLine.findOneAndUpdate.mockResolvedValue({ current: 12, target: 100, name: 'Sticky' });
		const result = await fillToTarget('g1', 'b1', '1');
		expect(result.current).toBe(100);
		expect(result.previous).toBe(12);
		expect(OrderLine.findOneAndUpdate).toHaveBeenCalledWith(
			expect.any(Object),
			expect.any(Array),
			{ returnDocument: 'before', updatePipeline: true },
		);
	});

	it('createBoard rollback si bootstrap échoue', async () => {
		OrderBoard.findOne.mockResolvedValue(null);
		const created = { _id: 'b1', name: 'OP' };
		OrderBoard.create.mockResolvedValue(created);
		OrderBoard.deleteOne.mockResolvedValue({});
		mockBootstrap.mockRejectedValueOnce(new Error('send failed'));

		await expect(createBoard({
			guildId: 'g1',
			channelId: 'c1',
			ownerId: 'u1',
			name: 'OP',
			kind: 'prod',
			client: {},
			channel: { id: 'c1' },
		})).rejects.toThrow('send failed');

		expect(OrderBoard.deleteOne).toHaveBeenCalledWith({ _id: 'b1' });
	});

	it('correctLine met à jour current/target', async () => {
		const save = jest.fn().mockResolvedValue(undefined);
		OrderLine.findOne.mockResolvedValue({ current: 2, target: 10, save });
		const line = await correctLine('g1', 'b1', '1', { current: 5, target: 12 });
		expect(line.current).toBe(5);
		expect(line.target).toBe(12);
	});

	it('createLine alloue un id et crée la ligne', async () => {
		OrderLine.countDocuments.mockResolvedValue(0);
		OrderLine.create.mockResolvedValue({ line_id: '7' });
		const board = { _id: 'b1', guild_id: 'g1' };
		await createLine(board, { name: 'Sticky', category: 'utilities', target: 20, ownerId: 'u1' });
		expect(mockAllocate).toHaveBeenCalledWith('g1', 'b1');
		expect(OrderLine.create).toHaveBeenCalledWith(expect.objectContaining({
			line_id: '7',
			name: 'Sticky',
			current: 0,
			target: 20,
		}));
	});

	it('createLine refuse si board plein (50)', async () => {
		OrderLine.countDocuments.mockResolvedValue(50);
		const board = { _id: 'b1', guild_id: 'g1' };
		await expect(createLine(board, {
			name: 'Sticky',
			category: 'utilities',
			target: 20,
			ownerId: 'u1',
		})).rejects.toMatchObject({ code: 'ORDER_FULL' });
		expect(OrderLine.create).not.toHaveBeenCalled();
	});

	it('setDraft / getDraft / consumeDraft', async () => {
		const drafts = new Map();
		const board = {
			add_drafts: drafts,
			markModified: jest.fn(),
			save: jest.fn().mockResolvedValue(undefined),
		};
		await setDraft(board, 'u1', { name: 'RPG', category: 'ammunition' });
		expect(getDraft(board, 'u1')).toEqual({ name: 'RPG', category: 'ammunition' });
		const consumed = await consumeDraft(board, 'u1');
		expect(consumed.name).toBe('RPG');
		expect(getDraft(board, 'u1')).toBeNull();
	});

	it('findBoardByChannelAndName délègue au modèle', async () => {
		OrderBoard.findOne.mockResolvedValue({ name: 'OP' });
		await findBoardByChannelAndName('g1', 'c1', 'OP');
		expect(OrderBoard.findOne).toHaveBeenCalledWith({
			guild_id: 'g1',
			channel_id: 'c1',
			name: 'OP',
		});
	});

	it('findBoardById filtre guild optionnel', async () => {
		OrderBoard.findOne.mockResolvedValue({ _id: 'b1' });
		await findBoardById('b1', 'g1');
		expect(OrderBoard.findOne).toHaveBeenCalledWith({ _id: 'b1', guild_id: 'g1' });
		await findBoardById('b1');
		expect(OrderBoard.findOne).toHaveBeenCalledWith({ _id: 'b1' });
	});

	it('findBoardsByChannel trie par nom', async () => {
		const sort = jest.fn().mockResolvedValue([]);
		OrderBoard.find.mockReturnValue({ sort });
		await findBoardsByChannel('g1', 'c1');
		expect(OrderBoard.find).toHaveBeenCalledWith({ guild_id: 'g1', channel_id: 'c1' });
		expect(sort).toHaveBeenCalledWith({ name: 1 });
	});

	it('createBoard refuse kind invalide', async () => {
		await expect(createBoard({
			guildId: 'g1',
			channelId: 'c1',
			ownerId: 'u1',
			name: 'OP',
			kind: 'nope',
		})).rejects.toMatchObject({ code: 'ORDER_INVALID_KIND' });
	});

	it('createBoard mappe duplicate key Mongo', async () => {
		OrderBoard.findOne.mockResolvedValue(null);
		const dup = new Error('E11000');
		dup.code = 11000;
		OrderBoard.create.mockRejectedValue(dup);
		await expect(createBoard({
			guildId: 'g1',
			channelId: 'c1',
			ownerId: 'u1',
			name: 'OP',
			kind: 'prod',
		})).rejects.toMatchObject({ code: 'ORDER_ALREADY_EXISTS' });
	});

	it('createBoard propage les autres erreurs create', async () => {
		OrderBoard.findOne.mockResolvedValue(null);
		OrderBoard.create.mockRejectedValue(new Error('db down'));
		await expect(createBoard({
			guildId: 'g1',
			channelId: 'c1',
			ownerId: 'u1',
			name: 'OP',
			kind: 'prod',
		})).rejects.toThrow('db down');
	});

	it('deleteBoardsByOperation no-op si args manquants', async () => {
		expect(await deleteBoardsByOperation(null, 'op1')).toEqual([]);
		expect(await deleteBoardsByOperation('g1', null)).toEqual([]);
		expect(OrderBoard.find).not.toHaveBeenCalled();
	});

	it('setSelectedLine met à jour la sélection', async () => {
		const save = jest.fn().mockResolvedValue(undefined);
		const board = { selected_line_id: null, save };
		await setSelectedLine(board, 3);
		expect(board.selected_line_id).toBe('3');
		await setSelectedLine(board, null);
		expect(board.selected_line_id).toBeNull();
		expect(save).toHaveBeenCalledTimes(2);
	});

	it('cycleLinePriority cycle et ignore ligne absente', async () => {
		const save = jest.fn().mockResolvedValue(undefined);
		OrderLine.findOne.mockResolvedValue({ priority: 'low', save });
		const result = await cycleLinePriority('g1', 'b1', '1');
		expect(result.previous).toBe('low');
		expect(result.priority).toBe('neutral');
		OrderLine.findOne.mockResolvedValue(null);
		expect(await cycleLinePriority('g1', 'b1', '9')).toBeNull();
	});

	it('correctLine met à jour la priorité', async () => {
		const save = jest.fn().mockResolvedValue(undefined);
		OrderLine.findOne.mockResolvedValue({ current: 1, target: 5, priority: 'low', save });
		const line = await correctLine('g1', 'b1', '1', { priority: 'high' });
		expect(line.priority).toBe('high');
	});

	it('correctLine retourne null si ligne absente', async () => {
		OrderLine.findOne.mockResolvedValue(null);
		expect(await correctLine('g1', 'b1', '1', { current: 1 })).toBeNull();
	});

	it('deleteLine clear selected_line_id si ligne sélectionnée', async () => {
		OrderLine.deleteOne.mockResolvedValue({ deletedCount: 1 });
		const save = jest.fn().mockResolvedValue(undefined);
		OrderBoard.findOne.mockResolvedValue({ selected_line_id: '3', save });
		await deleteLine('g1', 'b1', '3');
		expect(save).toHaveBeenCalled();
	});

	it('deleteLine no-op sélection si autre ligne', async () => {
		OrderLine.deleteOne.mockResolvedValue({ deletedCount: 1 });
		const save = jest.fn().mockResolvedValue(undefined);
		OrderBoard.findOne.mockResolvedValue({ selected_line_id: '1', save });
		await deleteLine('g1', 'b1', '3');
		expect(save).not.toHaveBeenCalled();
	});

	it('getDraft retourne null sans Map', () => {
		expect(getDraft({}, 'u1')).toBeNull();
	});

	it('createLine rollback si course sur le plafond', async () => {
		OrderLine.countDocuments
			.mockResolvedValueOnce(49)
			.mockResolvedValueOnce(51);
		OrderLine.create.mockResolvedValue({ _id: 'l1', line_id: '7' });
		OrderLine.deleteOne.mockResolvedValue({});
		await expect(createLine({ _id: 'b1', guild_id: 'g1' }, {
			name: 'Sticky',
			category: 'utilities',
			target: 1,
			ownerId: 'u1',
		})).rejects.toMatchObject({ code: 'ORDER_FULL' });
		expect(OrderLine.deleteOne).toHaveBeenCalledWith({ _id: 'l1' });
	});

	it('createLine utilise board.save si dispo', async () => {
		OrderLine.countDocuments.mockResolvedValue(0);
		OrderLine.create.mockResolvedValue({ line_id: '7' });
		const save = jest.fn().mockResolvedValue(undefined);
		const board = { _id: 'b1', guild_id: 'g1', save };
		await createLine(board, { name: 'Sticky', category: 'utilities', target: 1, ownerId: 'u1' });
		expect(board.selected_line_id).toBe('7');
		expect(save).toHaveBeenCalled();
		expect(OrderBoard.updateOne).not.toHaveBeenCalled();
	});

	it('sortLines / listLines trient priorité puis id', async () => {
		expect(sortLines([
			{ line_id: '2', priority: 'low' },
			{ line_id: '1', priority: 'high' },
			{ line_id: '3', priority: 'high' },
		]).map((l) => l.line_id)).toEqual(['1', '3', '2']);
		expect(sortLines(null)).toEqual([]);

		OrderLine.find.mockReturnValue({
			lean: () => Promise.resolve([
				{ line_id: '2', priority: 'neutral' },
				{ line_id: '1', priority: 'high' },
			]),
		});
		const listed = await listLines({ _id: 'b1', guild_id: 'g1' });
		expect(listed.map((l) => l.line_id)).toEqual(['1', '2']);
	});

	it('fillToTarget ignore ligne absente', async () => {
		OrderLine.findOneAndUpdate.mockResolvedValue(null);
		expect(await fillToTarget('g1', 'b1', '9')).toBeNull();
	});
});
