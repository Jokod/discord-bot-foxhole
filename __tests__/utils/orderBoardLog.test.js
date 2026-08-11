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
	bootstrapOrderLogThread,
	isOrderLogsEnabled,
	deleteAllOrderLogThreads,
	ensureAllOrderLogThreads,
} = require('../../utils/orderBoardLog.js');
const { OrderBoard, TrackedMessage, Server } = require('../../data/models.js');

describe('orderBoardLog', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		Server.findOne.mockReturnValue({ lean: () => Promise.resolve({ logs: true }) });
	});

	it('isOrderLogsEnabled false sans guildId', async () => {
		await expect(isOrderLogsEnabled('')).resolves.toBe(false);
		expect(Server.findOne).not.toHaveBeenCalled();
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

	it('resolveLogThread désarchive un thread archivé', async () => {
		const setArchived = jest.fn().mockResolvedValue(undefined);
		const setLocked = jest.fn().mockResolvedValue(undefined);
		const client = {
			channels: {
				fetch: jest.fn().mockResolvedValue({
					isThread: () => true,
					archived: true,
					locked: true,
					setArchived,
					setLocked,
				}),
			},
		};
		const board = { _id: 'b1', log_thread_id: 'th1' };
		await resolveLogThread(client, board);
		expect(setArchived).toHaveBeenCalledWith(false);
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

	it('resolveLogThread sans log_thread_id sur board retourne null', async () => {
		const client = { channels: { fetch: jest.fn() } };
		await expect(resolveLogThread(client, { _id: 'b1' })).resolves.toBeNull();
		expect(client.channels.fetch).not.toHaveBeenCalled();
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

	it('deleteOrderLogThread fallback channels.delete sans thread.delete', async () => {
		const channelDelete = jest.fn().mockResolvedValue(undefined);
		const client = {
			channels: {
				fetch: jest.fn().mockResolvedValue({}),
				delete: channelDelete,
			},
		};
		const board = { _id: 'b1', log_thread_id: 'th1' };
		await deleteOrderLogThread(client, board);
		expect(channelDelete).toHaveBeenCalledWith('th1', 'Order board log removed');
		expect(board.log_thread_id).toBeNull();
	});

	describe('bootstrapOrderLogThread', () => {
		it('retourne null sans message tracké', async () => {
			TrackedMessage.findOne.mockReturnValue({ lean: () => Promise.resolve(null) });
			const client = { traductions: new Map() };
			const board = { _id: 'b1', guild_id: 'g1', name: 'Prod' };
			const channel = { threads: { create: jest.fn() } };

			await expect(bootstrapOrderLogThread(channel, client, board)).resolves.toBeNull();
			expect(channel.threads.create).not.toHaveBeenCalled();
		});

		it('retourne null si threads.create absent', async () => {
			TrackedMessage.findOne.mockReturnValue({
				lean: () => Promise.resolve({ message_id: 'm1' }),
			});
			const client = { traductions: new Map() };
			const board = { _id: 'b1', guild_id: 'g1', name: 'Prod' };

			await expect(bootstrapOrderLogThread({}, client, board)).resolves.toBeNull();
		});

		it('crée le thread si message tracké et channel valide', async () => {
			TrackedMessage.findOne.mockReturnValue({
				lean: () => Promise.resolve({ message_id: 'm1' }),
			});
			const setLocked = jest.fn().mockResolvedValue(undefined);
			const create = jest.fn().mockResolvedValue({ id: 'th-boot', setLocked });
			const channel = { threads: { create } };
			const client = { traductions: new Map() };
			const board = { _id: 'b1', guild_id: 'g1', name: 'Prod' };

			const thread = await bootstrapOrderLogThread(channel, client, board);

			expect(create).toHaveBeenCalled();
			expect(thread.id).toBe('th-boot');
		});
	});

	describe('ensureAllOrderLogThreads', () => {
		it('retourne 0/0 si client ou guildId absent', async () => {
			await expect(ensureAllOrderLogThreads(null, 'g1')).resolves.toEqual({ created: 0, skipped: 0 });
			await expect(ensureAllOrderLogThreads({}, '')).resolves.toEqual({ created: 0, skipped: 0 });
			expect(OrderBoard.find).not.toHaveBeenCalled();
		});

		it('compte created et skipped', async () => {
			OrderBoard.find.mockResolvedValue([
				{ _id: 'b1', guild_id: 'g1', channel_id: 'c1', name: 'A' },
				{ _id: 'b2', guild_id: 'g1', channel_id: 'c2', name: 'B' },
				{ _id: 'b3', guild_id: 'g1', channel_id: 'c3', name: 'C' },
			]);
			const setLocked = jest.fn().mockResolvedValue(undefined);
			const goodChannel = {
				threads: {
					create: jest.fn().mockResolvedValue({ id: 'th-new', setLocked }),
				},
			};
			const client = {
				traductions: new Map(),
				channels: {
					fetch: jest.fn()
						.mockResolvedValueOnce(goodChannel)
						.mockResolvedValueOnce(null)
						.mockResolvedValueOnce({ threads: {} }),
				},
			};

			const result = await ensureAllOrderLogThreads(client, 'g1');

			expect(result).toEqual({ created: 1, skipped: 2 });
		});

		it('compte skipped si createLogThread throw', async () => {
			OrderBoard.find.mockResolvedValue([
				{ _id: 'b1', guild_id: 'g1', channel_id: 'c1', name: 'A' },
			]);
			const create = jest.fn().mockRejectedValue(new Error('thread fail'));
			const client = {
				traductions: new Map(),
				channels: {
					fetch: jest.fn().mockResolvedValue({ threads: { create } }),
				},
			};

			const result = await ensureAllOrderLogThreads(client, 'g1');

			expect(result).toEqual({ created: 0, skipped: 1 });
		});

		it('compte skipped si createLogThread retourne null (logs off)', async () => {
			Server.findOne.mockReturnValue({ lean: () => Promise.resolve({ logs: false }) });
			OrderBoard.find.mockResolvedValue([
				{ _id: 'b1', guild_id: 'g1', channel_id: 'c1', name: 'A' },
			]);
			const create = jest.fn();
			const client = {
				traductions: new Map(),
				channels: {
					fetch: jest.fn().mockResolvedValue({ threads: { create } }),
				},
			};

			const result = await ensureAllOrderLogThreads(client, 'g1');

			expect(result).toEqual({ created: 0, skipped: 1 });
			expect(create).not.toHaveBeenCalled();
		});

		it('fetch channel reject compte skipped', async () => {
			OrderBoard.find.mockResolvedValue([
				{ _id: 'b1', guild_id: 'g1', channel_id: 'c1', name: 'A' },
			]);
			const client = {
				traductions: new Map(),
				channels: {
					fetch: jest.fn().mockRejectedValue(new Error('channel gone')),
				},
			};

			const result = await ensureAllOrderLogThreads(client, 'g1');

			expect(result).toEqual({ created: 0, skipped: 1 });
		});
	});

	it('appendOrderLog no-op sans client/board/content', async () => {
		await expect(appendOrderLog(null, { _id: 'b1' }, 'x')).resolves.toBe(false);
		await expect(appendOrderLog({}, null, 'x')).resolves.toBe(false);
		await expect(appendOrderLog({}, { _id: 'b1', guild_id: 'g1' }, '')).resolves.toBe(false);
	});

	it('appendOrderLog no-op si thread introuvable', async () => {
		const client = { channels: { fetch: jest.fn().mockResolvedValue(null) } };
		const board = { _id: 'b1', guild_id: 'g1', log_thread_id: 'gone' };
		await expect(appendOrderLog(client, board, 'hello')).resolves.toBe(false);
	});

	it('resolveLogThread clear id si channel non-thread', async () => {
		const client = {
			channels: {
				fetch: jest.fn().mockResolvedValue({ isThread: () => false }),
			},
		};
		const board = { _id: 'b1', log_thread_id: 'ch-not-thread' };
		await expect(resolveLogThread(client, board)).resolves.toBeNull();
		expect(OrderBoard.updateOne).toHaveBeenCalledWith({ _id: 'b1' }, { log_thread_id: null });
	});

	it('deleteOrderLogThread no-op sans log_thread_id ou client', async () => {
		await deleteOrderLogThread(null, { _id: 'b1', log_thread_id: 'th1' });
		await deleteOrderLogThread({}, { _id: 'b1' });
		expect(OrderBoard.updateOne).not.toHaveBeenCalled();
	});

	it('deleteAllOrderLogThreads no-op sans client/guildId', async () => {
		await deleteAllOrderLogThreads(null, 'g1');
		await deleteAllOrderLogThreads({}, '');
		expect(OrderBoard.find).not.toHaveBeenCalled();
	});

	it('createLogThread ignore setLocked en échec', async () => {
		const setLocked = jest.fn().mockRejectedValue(new Error('lock fail'));
		const create = jest.fn().mockResolvedValue({ id: 'th-new', setLocked });
		const channel = { threads: { create } };
		const board = { _id: 'b1', guild_id: 'g1', name: 'Prod' };
		const translations = { translate: (k, v) => (v?.name ? `${k}:${v.name}` : k) };

		await expect(createLogThread(channel, board, translations)).resolves.toMatchObject({ id: 'th-new' });
		expect(setLocked).toHaveBeenCalled();
	});

	it('deleteOrderLogThread utilise client.channels.delete si thread sans delete', async () => {
		const channelDelete = jest.fn().mockResolvedValue(undefined);
		const client = {
			channels: {
				fetch: jest.fn().mockResolvedValue({}),
				delete: channelDelete,
			},
		};
		const board = { _id: 'b1', log_thread_id: 'th1' };
		await deleteOrderLogThread(client, board);
		expect(channelDelete).toHaveBeenCalledWith('th1', 'Order board log removed');
	});

	it('deleteOrderLogThread ignore fetch/delete/updateOne en échec', async () => {
		OrderBoard.updateOne.mockRejectedValueOnce(new Error('db fail'));
		const client = {
			channels: {
				fetch: jest.fn().mockRejectedValue(new Error('fetch fail')),
				delete: jest.fn().mockRejectedValue(new Error('del fail')),
			},
		};
		const board = { _id: 'b1', log_thread_id: 'th1' };
		await deleteOrderLogThread(client, board);
		expect(board.log_thread_id).toBeNull();
	});

	it('deleteOrderLogThread utilise channels.delete sans thread.delete', async () => {
		const channelsDelete = jest.fn().mockResolvedValue(undefined);
		const client = {
			channels: {
				fetch: jest.fn().mockResolvedValue({ id: 'th1' }),
				delete: channelsDelete,
			},
		};
		const board = { _id: 'b1', log_thread_id: 'th1' };
		await deleteOrderLogThread(client, board);
		expect(channelsDelete).toHaveBeenCalledWith('th1', 'Order board log removed');
	});

	it('resolveLogThread clear board.log_thread_id en mémoire', async () => {
		const client = { channels: { fetch: jest.fn().mockResolvedValue({ isThread: () => false }) } };
		const board = { _id: 'b1', log_thread_id: 'stale' };
		await resolveLogThread(client, board);
		expect(board.log_thread_id).toBeNull();
	});

	it('appendOrderLog ignore send catch handler', async () => {
		const send = jest.fn().mockRejectedValue(new Error('send fail'));
		const client = {
			channels: {
				fetch: jest.fn().mockResolvedValue({
					isThread: () => true,
					archived: false,
					locked: true,
					send,
					setLocked: jest.fn().mockResolvedValue(undefined),
				}),
			},
		};
		const board = { _id: 'b1', guild_id: 'g1', log_thread_id: 'th1' };
		await expect(appendOrderLog(client, board, 'hello')).resolves.toBe(true);
	});

	it('resolveLogThread ignore setArchived/setLocked en échec', async () => {
		const setArchived = jest.fn().mockRejectedValue(new Error('arch fail'));
		const setLocked = jest.fn().mockRejectedValue(new Error('lock fail'));
		const client = {
			channels: {
				fetch: jest.fn().mockResolvedValue({
					isThread: () => true,
					archived: true,
					locked: false,
					setArchived,
					setLocked,
				}),
			},
		};
		const board = { _id: 'b1', log_thread_id: 'th1' };
		await expect(resolveLogThread(client, board)).resolves.toBeTruthy();
	});

	it('resolveLogThread updateOne catch callback exécuté', async () => {
		OrderBoard.updateOne.mockReturnValueOnce(Promise.reject(new Error('db fail')));
		const client = {
			channels: {
				fetch: jest.fn().mockResolvedValue({ id: 'ch1', isThread: () => false }),
			},
		};
		await expect(resolveLogThread(client, { _id: 'b1', log_thread_id: 'th1' })).resolves.toBeNull();
	});

	it('deleteOrderLogThread channels.delete catch exécuté', async () => {
		const client = {
			channels: {
				fetch: jest.fn().mockResolvedValue(null),
				delete: jest.fn().mockReturnValue(Promise.reject(new Error('del fail'))),
			},
		};
		await deleteOrderLogThread(client, { _id: 'b1', log_thread_id: 'th1' });
	});

	it('resolveLogThread ignore updateOne reject sur channel non-thread', async () => {
		OrderBoard.updateOne.mockReturnValueOnce(Promise.reject(new Error('db fail')));
		const client = {
			channels: {
				fetch: jest.fn().mockResolvedValue({ id: 'ch1', isThread: () => false }),
			},
		};
		const board = { _id: 'b1', log_thread_id: 'gone' };
		await expect(resolveLogThread(client, board)).resolves.toBeNull();
	});

	it('deleteOrderLogThread invoke channels.delete catch callback', async () => {
		const channelsDelete = jest.fn().mockReturnValue(Promise.reject(new Error('del fail')));
		const client = {
			channels: {
				fetch: jest.fn().mockResolvedValue(null),
				delete: channelsDelete,
			},
		};
		const board = { _id: 'b1', log_thread_id: 'th1' };
		await deleteOrderLogThread(client, board);
		expect(channelsDelete).toHaveBeenCalledWith('th1', 'Order board log removed');
		expect(board.log_thread_id).toBeNull();
	});

	it('resolveLogThread ignore updateOne en échec', async () => {
		OrderBoard.updateOne.mockRejectedValueOnce(new Error('db fail'));
		const client = { channels: { fetch: jest.fn().mockRejectedValue(new Error('fetch fail')) } };
		const board = { _id: 'b1', log_thread_id: 'gone' };
		await expect(resolveLogThread(client, board)).resolves.toBeNull();
	});

	it('deleteOrderLogThread ignore delete en échec', async () => {
		const del = jest.fn().mockRejectedValue(new Error('del fail'));
		const client = {
			channels: {
				fetch: jest.fn().mockResolvedValue({ delete: del }),
				delete: jest.fn().mockRejectedValue(new Error('del2 fail')),
			},
		};
		const board = { _id: 'b1', log_thread_id: 'th1' };
		await deleteOrderLogThread(client, board);
		expect(board.log_thread_id).toBeNull();
	});

	it('deleteOrderLogThread sans board._id', async () => {
		const del = jest.fn().mockResolvedValue(undefined);
		const client = { channels: { fetch: jest.fn().mockResolvedValue({ delete: del }) } };
		const board = { log_thread_id: 'th1' };
		await deleteOrderLogThread(client, board);
		expect(OrderBoard.updateOne).not.toHaveBeenCalled();
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
