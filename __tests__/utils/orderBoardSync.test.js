jest.mock('../../utils/translations.js', () => jest.fn().mockImplementation(() => ({
	translate: (key, vars) => {
		if (vars?.title) return `${key}:${vars.title}`;
		return key;
	},
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
const mockOrderBoardFind = jest.fn();
const mockOrderBoardUpdateOne = jest.fn().mockResolvedValue({});
const mockOrderLineFind = jest.fn();
const mockTrackedFind = jest.fn();
const mockTrackedDeleteMany = jest.fn();
const mockOpFindOne = jest.fn();

jest.mock('../../data/models.js', () => ({
	OrderBoard: {
		findById: (...args) => mockFindById(...args),
		findOneAndUpdate: (...args) => mockFindOneAndUpdate(...args),
		find: (...args) => mockOrderBoardFind(...args),
		updateOne: (...args) => mockOrderBoardUpdateOne(...args),
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
	buildOrderPayload,
	bootstrapOrderBoard,
	refreshOrderBoard,
	refreshOrderBoardDebounced,
	deleteOrderTrackedMessages,
	syncAllOrderBoards,
} = require('../../utils/orderBoardSync.js');
const { createLogThread } = require('../../utils/orderBoardLog.js');

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

	describe('buildOrderPayload', () => {
		it('trie les lignes par priorité puis line_id', async () => {
			mockOrderLineFind.mockReturnValue({
				lean: () => Promise.resolve([
					{ line_id: '2', priority: 'low' },
					{ line_id: '1', priority: 'high' },
					{ line_id: '3', priority: 'high' },
				]),
			});
			const board = {
				_id: 'b1',
				guild_id: 'g1',
				name: 'OP',
				kind: 'prod',
				status: 'open',
				page: 0,
				selected_line_id: '1',
			};
			const client = { traductions: new Map() };

			const { lines } = await buildOrderPayload(client, board);

			expect(lines.map((l) => l.line_id)).toEqual(['1', '3', '2']);
		});

		it('utilise le titre opération ou fallback operation_id', async () => {
			mockOrderLineFind.mockReturnValue({ lean: () => Promise.resolve([]) });
			const board = {
				_id: 'b1',
				guild_id: 'g1',
				name: 'OP',
				kind: 'prod',
				status: 'open',
				page: 0,
				operation_id: 'op-42',
			};
			const client = { traductions: new Map() };

			mockOpFindOne.mockReturnValue({ lean: () => Promise.resolve({ title: 'Assault' }) });
			const withTitle = await buildOrderPayload(client, board);
			expect(withTitle.embed.data.description).toContain('Assault');

			mockOpFindOne.mockReturnValue({ lean: () => Promise.resolve(null) });
			const withFallback = await buildOrderPayload(client, board);
			expect(withFallback.embed.data.description).toContain('op-42');
		});

		it('auto-sélectionne la première ligne si sélection invalide', async () => {
			mockOrderLineFind.mockReturnValue({
				lean: () => Promise.resolve([
					{ line_id: '10', priority: 'neutral' },
					{ line_id: '20', priority: 'low' },
				]),
			});
			const board = {
				_id: 'b1',
				guild_id: 'g1',
				name: 'OP',
				kind: 'prod',
				status: 'open',
				page: 0,
				selected_line_id: 'gone',
			};
			const client = { traductions: new Map() };

			await buildOrderPayload(client, board);

			expect(board.selected_line_id).toBe('10');
			expect(mockOrderBoardUpdateOne).toHaveBeenCalledWith(
				{ _id: 'b1' },
				{ selected_line_id: '10' },
			);
		});

		it('efface la sélection quand il n’y a plus de lignes', async () => {
			mockOrderLineFind.mockReturnValue({ lean: () => Promise.resolve([]) });
			const board = {
				_id: 'b1',
				guild_id: 'g1',
				name: 'OP',
				kind: 'prod',
				status: 'open',
				page: 0,
				selected_line_id: '5',
			};
			const client = { traductions: new Map() };

			await buildOrderPayload(client, board);

			expect(board.selected_line_id).toBeNull();
			expect(mockOrderBoardUpdateOne).toHaveBeenCalledWith(
				{ _id: 'b1' },
				{ selected_line_id: null },
			);
		});
	});

	it('bootstrapOrderBoard log console.error si createLogThread échoue', async () => {
		const errSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
		createLogThread.mockRejectedValueOnce(new Error('thread fail'));
		const send = jest.fn().mockResolvedValue({ id: 'msg1' });
		const channel = { send, id: 'c1' };
		const board = { _id: 'b1', guild_id: 'g1', name: 'OP', kind: 'prod', status: 'open', page: 0 };
		const client = { traductions: new Map() };

		await bootstrapOrderBoard(channel, client, board);

		expect(errSpy).toHaveBeenCalledWith(
			expect.stringContaining('[OrderBoard] log thread failed for b1:'),
			'thread fail',
		);
		errSpy.mockRestore();
	});

	it('refreshOrderBoard fetch le channel si omis', async () => {
		const board = {
			_id: 'b1',
			guild_id: 'g1',
			channel_id: 'c1',
			name: 'OP',
			kind: 'prod',
			status: 'open',
			page: 0,
		};
		mockFindById.mockResolvedValue(board);
		const channel = { id: 'c1', isTextBased: () => true };
		const fetch = jest.fn().mockResolvedValue(channel);
		const client = { traductions: new Map(), channels: { fetch } };

		const ok = await refreshOrderBoard(client, board);

		expect(fetch).toHaveBeenCalledWith('c1');
		expect(ok).toBe(true);
	});

	it('refreshOrderBoard recrée le log thread après usedFallback', async () => {
		mockEditTracked.mockResolvedValueOnce({ usedFallback: true });
		const board = {
			_id: 'b1',
			guild_id: 'g1',
			channel_id: 'c1',
			name: 'OP',
			kind: 'prod',
			status: 'open',
			page: 0,
		};
		mockFindById.mockResolvedValue({ ...board });
		const channel = { id: 'c1', isTextBased: () => true };
		const client = { traductions: new Map() };

		await refreshOrderBoard(client, board, channel);

		expect(createLogThread).toHaveBeenCalledWith(channel, expect.objectContaining({ _id: 'b1' }), expect.anything());
	});

	it('deleteOrderTrackedMessages fetch un autre channel via client', async () => {
		mockTrackedFind.mockReturnValue({
			lean: () => Promise.resolve([
				{ message_id: 'm2', channel_id: 'c2' },
			]),
		});
		const msgDelete = jest.fn().mockResolvedValue(undefined);
		const otherChannel = {
			id: 'c2',
			isTextBased: () => true,
			messages: {
				fetch: jest.fn().mockResolvedValue({ delete: msgDelete }),
			},
		};
		const fetch = jest.fn().mockResolvedValue(otherChannel);
		const client = { channels: { fetch } };

		await deleteOrderTrackedMessages('g1', 'b1', { id: 'c1', isTextBased: () => true }, client);

		expect(fetch).toHaveBeenCalledWith('c2');
		expect(msgDelete).toHaveBeenCalled();
	});

	it('refreshOrderBoardDebounced résout false si refresh échoue', async () => {
		jest.useFakeTimers();
		const errSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
		mockFindById.mockRejectedValue(new Error('db down'));
		const board = { _id: 'b1', guild_id: 'g1', channel_id: 'c1', name: 'OP', kind: 'prod', status: 'open' };
		const channel = { id: 'c1', isTextBased: () => true };
		const client = { traductions: new Map() };

		const promise = refreshOrderBoardDebounced(client, board, channel);
		await jest.runAllTimersAsync();
		await expect(promise).resolves.toBe(false);
		expect(errSpy).toHaveBeenCalledWith(
			expect.stringContaining('[OrderBoard] debounced refresh failed for b1:'),
			'db down',
		);
		jest.useRealTimers();
		errSpy.mockRestore();
	});

	it('syncAllOrderBoards compte ok et fail', async () => {
		const logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
		const boards = [
			{ _id: 'b1', guild_id: 'g1', channel_id: 'c1', name: 'A', kind: 'prod', status: 'open', page: 0 },
			{ _id: 'b2', guild_id: 'g2', channel_id: 'c2', name: 'B', kind: 'prod', status: 'open', page: 0 },
		];
		mockOrderBoardFind.mockReturnValue({ lean: () => Promise.resolve(boards) });
		mockFindById
			.mockResolvedValueOnce(boards[0])
			.mockResolvedValueOnce(null);
		const channel = { id: 'c1', isTextBased: () => true };
		const client = {
			traductions: new Map(),
			channels: { fetch: jest.fn().mockResolvedValue(channel) },
		};

		const result = await syncAllOrderBoards(client);

		expect(result).toEqual({ ok: 1, fail: 1, total: 2 });
		expect(logSpy).toHaveBeenCalledWith('[OrderBoard] syncAllOrderBoards done: ok=1 fail=1 total=2');
		logSpy.mockRestore();
	});

	it('refreshOrderBoard retourne false sans board._id ou guild_id', async () => {
		expect(await refreshOrderBoard({}, { guild_id: 'g1' })).toBe(false);
		expect(await refreshOrderBoard({}, { _id: 'b1' })).toBe(false);
	});

	it('refreshOrderBoard retourne false si channel non textuel', async () => {
		const board = { _id: 'b1', guild_id: 'g1', channel_id: 'c1', name: 'OP', kind: 'prod', status: 'open', page: 0 };
		mockFindById.mockResolvedValue(board);
		const client = {
			traductions: new Map(),
			channels: { fetch: jest.fn().mockResolvedValue({ isTextBased: () => false }) },
		};
		expect(await refreshOrderBoard(client, board)).toBe(false);
	});

	it('refreshOrderBoard exécute fallbackSend quand editTracked le demande', async () => {
		const send = jest.fn().mockResolvedValue({ id: 'msg-new' });
		mockEditTracked.mockImplementationOnce(async ({ fallbackSend }) => {
			await fallbackSend();
			return { usedFallback: true };
		});
		const board = { _id: 'b1', guild_id: 'g1', channel_id: 'c1', name: 'OP', kind: 'prod', status: 'open', page: 0, log_thread_id: 'th1' };
		mockFindById.mockResolvedValue(board);
		const channel = { id: 'c1', isTextBased: () => true, send };
		const client = { traductions: new Map() };

		await refreshOrderBoard(client, board, channel);

		expect(send).toHaveBeenCalled();
		expect(createLogThread).not.toHaveBeenCalled();
	});

	it('syncAllOrderBoards log erreur si refresh throw', async () => {
		const errSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
		mockOrderBoardFind.mockReturnValue({
			lean: () => Promise.resolve([{ _id: 'b1', guild_id: 'g1', channel_id: 'c1' }]),
		});
		mockFindById.mockRejectedValue(new Error('boom'));
		const client = { traductions: new Map(), channels: { fetch: jest.fn() } };

		const result = await syncAllOrderBoards(client);

		expect(result).toEqual({ ok: 0, fail: 1, total: 1 });
		expect(errSpy).toHaveBeenCalledWith(
			expect.stringContaining('[OrderBoard] refresh failed for b1:'),
			'boom',
		);
		errSpy.mockRestore();
	});

	it('refreshOrderBoard retourne false si fetch channel reject', async () => {
		const board = { _id: 'b1', guild_id: 'g1', channel_id: 'c1', name: 'OP', kind: 'prod', status: 'open', page: 0 };
		mockFindById.mockResolvedValue(board);
		const client = {
			traductions: new Map(),
			channels: { fetch: jest.fn().mockReturnValue(Promise.reject(new Error('no channel'))) },
		};
		expect(await refreshOrderBoard(client, board)).toBe(false);
	});

	it('deleteOrderTrackedMessages sans channel ni client ne supprime pas Discord', async () => {
		mockTrackedFind.mockReturnValue({
			lean: () => Promise.resolve([{ message_id: 'm1', channel_id: 'c1' }]),
		});
		await deleteOrderTrackedMessages('g1', 'b1');
		expect(mockTrackedDeleteMany).toHaveBeenCalled();
	});

	it('buildOrderPayload conserve selected_line_id valide', async () => {
		mockOrderLineFind.mockReturnValue({
			lean: () => Promise.resolve([
				{ line_id: '10', priority: 'neutral' },
				{ line_id: '20', priority: 'low' },
			]),
		});
		const board = {
			_id: 'b1',
			guild_id: 'g1',
			name: 'OP',
			kind: 'prod',
			status: 'open',
			page: 0,
			selected_line_id: '10',
		};
		await buildOrderPayload({ traductions: new Map() }, board);
		expect(board.selected_line_id).toBe('10');
		expect(mockOrderBoardUpdateOne).not.toHaveBeenCalled();
	});

	it('buildOrderPayload sortLines avec lines null', async () => {
		mockOrderLineFind.mockReturnValue({ lean: () => Promise.resolve(null) });
		const board = {
			_id: 'b1',
			guild_id: 'g1',
			name: 'OP',
			kind: 'prod',
			status: 'open',
			page: 0,
			selected_line_id: '99',
		};
		await buildOrderPayload({ traductions: new Map() }, board);
		expect(mockOrderBoardUpdateOne).toHaveBeenCalledWith(
			{ _id: 'b1' },
			{ selected_line_id: null },
		);
	});

	it('deleteOrderTrackedMessages ignore entrées sans message_id', async () => {
		mockTrackedFind.mockReturnValue({
			lean: () => Promise.resolve([
				{ message_id: null, channel_id: 'c1' },
				{ channel_id: 'c1' },
			]),
		});
		const deleteMsg = jest.fn();
		const channel = {
			id: 'c1',
			isTextBased: () => true,
			messages: { fetch: jest.fn().mockResolvedValue({ delete: deleteMsg }) },
		};
		await deleteOrderTrackedMessages('g1', 'b1', channel);
		expect(deleteMsg).not.toHaveBeenCalled();
		expect(mockTrackedDeleteMany).toHaveBeenCalled();
	});

	it('deleteOrderTrackedMessages fetch channel catch retourne null', async () => {
		mockTrackedFind.mockReturnValue({
			lean: () => Promise.resolve([{ message_id: 'm2', channel_id: 'c2' }]),
		});
		const client = {
			channels: {
				fetch: jest.fn().mockReturnValue(Promise.reject(new Error('no channel'))),
			},
		};
		await deleteOrderTrackedMessages('g1', 'b1', { id: 'c1', isTextBased: () => true }, client);
		expect(mockTrackedDeleteMany).toHaveBeenCalled();
	});

	it('deleteOrderTrackedMessages résout channel alternatif via client', async () => {
		mockTrackedFind.mockReturnValue({
			lean: () => Promise.resolve([{ message_id: 'm1', channel_id: 'c2' }]),
		});
		const deleteMsg = jest.fn().mockResolvedValue(undefined);
		const altChannel = {
			id: 'c2',
			isTextBased: () => true,
			messages: { fetch: jest.fn().mockResolvedValue({ delete: deleteMsg }) },
		};
		const client = { channels: { fetch: jest.fn().mockResolvedValue(altChannel) } };
		await deleteOrderTrackedMessages('g1', 'b1', { id: 'c1', isTextBased: () => true }, client);
		expect(deleteMsg).toHaveBeenCalled();
	});

	it('refreshOrderBoardDebounced exécute le timer callback', async () => {
		jest.useFakeTimers();
		mockFindById.mockResolvedValue({
			_id: 'b1',
			guild_id: 'g1',
			channel_id: 'c1',
		});
		mockOrderLineFind.mockReturnValue({ lean: () => Promise.resolve([]) });
		const channel = { id: 'c1', isTextBased: () => true };
		const client = { traductions: new Map(), channels: { fetch: jest.fn() } };
		const p = refreshOrderBoardDebounced(client, { _id: 'b1', guild_id: 'g1' }, channel);
		jest.runAllTimersAsync();
		await expect(p).resolves.toBe(true);
		jest.useRealTimers();
	});

	it('refreshOrderBoardDebounced resolve false si timer remplacé', async () => {
		jest.useFakeTimers();
		const client = { traductions: new Map(), channels: { fetch: jest.fn() } };
		const board = { _id: 'b1', guild_id: 'g1' };
		const p1 = refreshOrderBoardDebounced(client, board);
		const p2 = refreshOrderBoardDebounced(client, board);
		jest.runAllTimersAsync();
		await expect(p1).resolves.toBe(false);
		await expect(p2).resolves.toBe(false);
		jest.useRealTimers();
	});

	it('refreshOrderBoardDebounced resolve false si refresh throw', async () => {
		jest.useFakeTimers();
		mockFindById.mockRejectedValue(new Error('db down'));
		const errSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
		const client = { traductions: new Map(), channels: { fetch: jest.fn() } };
		const p = refreshOrderBoardDebounced(client, { _id: 'b1', guild_id: 'g1' });
		jest.runAllTimersAsync();
		await expect(p).resolves.toBe(false);
		errSpy.mockRestore();
		jest.useRealTimers();
	});

	it('refreshOrderBoard createLogThread catch ignore erreur', async () => {
		createLogThread.mockRejectedValueOnce(new Error('thread fail'));
		mockEditTracked.mockResolvedValueOnce({ usedFallback: true });
		const board = {
			_id: 'b1',
			guild_id: 'g1',
			channel_id: 'c1',
			name: 'OP',
			kind: 'prod',
			status: 'open',
			page: 0,
		};
		mockFindById.mockResolvedValue({ ...board });
		const channel = { id: 'c1', isTextBased: () => true };
		const client = { traductions: new Map() };
		await expect(refreshOrderBoard(client, board, channel)).resolves.toBe(true);
	});

	it('deleteOrderTrackedMessages ignore delete message en échec', async () => {
		mockTrackedFind.mockReturnValue({
			lean: () => Promise.resolve([{ message_id: 'm1', channel_id: 'c1' }]),
		});
		const deleteMsg = jest.fn().mockRejectedValue(new Error('gone'));
		const channel = {
			id: 'c1',
			isTextBased: () => true,
			messages: { fetch: jest.fn().mockResolvedValue({ delete: deleteMsg }) },
		};
		await deleteOrderTrackedMessages('g1', 'b1', channel);
		expect(mockTrackedDeleteMany).toHaveBeenCalled();
	});
});
