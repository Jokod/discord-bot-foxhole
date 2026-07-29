'use strict';

jest.mock('../../data/models.js', () => ({
	OrderBoard: { updateOne: jest.fn().mockResolvedValue({}), find: jest.fn() },
	TrackedMessage: { findOne: jest.fn() },
	Server: { findOne: jest.fn() },
}));

jest.mock('../../utils/translations.js', () => jest.fn().mockImplementation(() => ({
	translate: (key, vars) => (vars?.name ? `${key}:${vars.name}` : key),
})));

const {
	appendOrderLog,
	resolveLogThread,
	deleteOrderLogThread,
	createLogThread,
	isOrderLogsEnabled,
	deleteAllOrderLogThreads,
} = require('../../utils/orderBoardLog.js');
const { OrderBoard, Server } = require('../../data/models.js');

describe('orderBoardLog', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		Server.findOne.mockReturnValue({ lean: () => Promise.resolve({ logs: true }) });
	});

	it('isOrderLogsEnabled false par défaut / serveur sans logs', async () => {
		Server.findOne.mockReturnValue({ lean: () => Promise.resolve({ logs: false }) });
		await expect(isOrderLogsEnabled('g1')).resolves.toBe(false);
		Server.findOne.mockReturnValue({ lean: () => Promise.resolve(null) });
		await expect(isOrderLogsEnabled('g1')).resolves.toBe(false);
	});

	it('createLogThread no-op si logs désactivés', async () => {
		Server.findOne.mockReturnValue({ lean: () => Promise.resolve({ logs: false }) });
		const create = jest.fn();
		const channel = { threads: { create } };
		const board = { _id: 'b1', guild_id: 'g1', name: 'Prod' };
		const translations = { translate: (k) => k };

		await expect(createLogThread(channel, board, translations)).resolves.toBeNull();
		expect(create).not.toHaveBeenCalled();
	});

	it('createLogThread crée un thread autonome si logs activés', async () => {
		const setLocked = jest.fn().mockResolvedValue(undefined);
		const send = jest.fn();
		const create = jest.fn().mockResolvedValue({
			id: 'th-new',
			setLocked,
			send,
		});
		const channel = { threads: { create } };
		const board = { _id: 'b1', guild_id: 'g1', name: 'Prod' };
		const translations = { translate: (k, v) => (v?.name ? `${k}:${v.name}` : k) };

		const thread = await createLogThread(channel, board, translations);

		expect(create).toHaveBeenCalledWith(expect.objectContaining({
			name: 'ORDER_LOG_THREAD:Prod',
			type: expect.anything(),
		}));
		expect(setLocked).toHaveBeenCalled();
		expect(thread.id).toBe('th-new');
		expect(board.log_thread_id).toBe('th-new');
		expect(OrderBoard.updateOne).toHaveBeenCalledWith(
			{ _id: 'b1' },
			{ log_thread_id: 'th-new' },
		);
		expect(send).not.toHaveBeenCalled();
	});

	it('appendOrderLog no-op si logs désactivés', async () => {
		Server.findOne.mockReturnValue({ lean: () => Promise.resolve({ logs: false }) });
		const client = { channels: { fetch: jest.fn() } };
		const board = { _id: 'b1', guild_id: 'g1', log_thread_id: 'th1' };
		await expect(appendOrderLog(client, board, 'hello')).resolves.toBe(false);
		expect(client.channels.fetch).not.toHaveBeenCalled();
	});

	it('appendOrderLog envoie dans le thread', async () => {
		const send = jest.fn().mockResolvedValue({});
		const setLocked = jest.fn().mockResolvedValue(undefined);
		const client = {
			channels: {
				fetch: jest.fn().mockResolvedValue({
					isThread: () => true,
					archived: false,
					locked: true,
					send,
					setLocked,
				}),
			},
		};
		const board = { _id: 'b1', guild_id: 'g1', log_thread_id: 'th1' };
		await expect(appendOrderLog(client, board, 'hello')).resolves.toBe(true);
		expect(send).toHaveBeenCalledWith({ content: 'hello' });
	});

	it('resolveLogThread re-verrouille si besoin', async () => {
		const setLocked = jest.fn().mockResolvedValue(undefined);
		const client = {
			channels: {
				fetch: jest.fn().mockResolvedValue({
					isThread: () => true,
					archived: false,
					locked: false,
					setLocked,
				}),
			},
		};
		const board = { _id: 'b1', log_thread_id: 'th1' };
		await resolveLogThread(client, board);
		expect(setLocked).toHaveBeenCalled();
	});

	it('resolveLogThread clear id si channel mort', async () => {
		const client = { channels: { fetch: jest.fn().mockResolvedValue(null) } };
		const board = { _id: 'b1', log_thread_id: 'gone' };
		await expect(resolveLogThread(client, board)).resolves.toBeNull();
		expect(OrderBoard.updateOne).toHaveBeenCalledWith(
			{ _id: 'b1' },
			{ log_thread_id: null },
		);
	});

	it('deleteOrderLogThread appelle delete même si logs false', async () => {
		Server.findOne.mockReturnValue({ lean: () => Promise.resolve({ logs: false }) });
		const del = jest.fn().mockResolvedValue(undefined);
		const client = {
			channels: { fetch: jest.fn().mockResolvedValue({ delete: del }) },
		};
		const board = { _id: 'b1', log_thread_id: 'th1' };
		await deleteOrderLogThread(client, board);
		expect(del).toHaveBeenCalled();
		expect(board.log_thread_id).toBeNull();
		expect(OrderBoard.updateOne).toHaveBeenCalledWith(
			{ _id: 'b1' },
			{ log_thread_id: null },
		);
	});

	it('deleteAllOrderLogThreads purge tous les boards', async () => {
		const del = jest.fn().mockResolvedValue(undefined);
		OrderBoard.find.mockResolvedValue([
			{ _id: 'b1', log_thread_id: 'th1' },
			{ _id: 'b2', log_thread_id: 'th2' },
		]);
		const client = {
			channels: {
				fetch: jest.fn()
					.mockResolvedValueOnce({ delete: del })
					.mockResolvedValueOnce({ delete: del }),
			},
		};
		await deleteAllOrderLogThreads(client, 'g1');
		expect(OrderBoard.find).toHaveBeenCalledWith({
			guild_id: 'g1',
			log_thread_id: { $nin: [null, ''] },
		});
		expect(del).toHaveBeenCalledTimes(2);
	});
});
