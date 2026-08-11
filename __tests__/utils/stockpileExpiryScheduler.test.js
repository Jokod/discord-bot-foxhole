const mockTranslate = jest.fn((key, params = {}) => {
	const parts = Object.entries(params).map(([k, v]) => `${k}=${v}`);
	return [key, ...parts].join(' ');
});

jest.mock('../../utils/translations.js', () => jest.fn().mockImplementation(() => ({ translate: mockTranslate })));
jest.mock('../../utils/formatLocation.js', () => ({ formatForDisplay: (x) => x || '' }));

const mockFind = jest.fn();
const mockFindByIdAndUpdate = jest.fn();
const mockRefreshTrackedStockpileLists = jest.fn().mockResolvedValue(0);

jest.mock('../../data/models.js', () => ({
	Stockpile: {
		find: jest.fn().mockReturnValue({ lean: jest.fn() }),
		findByIdAndUpdate: mockFindByIdAndUpdate,
		deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
	},
	NotificationSubscription: {
		find: jest.fn().mockReturnValue({ lean: jest.fn() }),
	},
}));

jest.mock('../../utils/stockpileListSync.js', () => ({
	refreshTrackedStockpileLists: (...args) => mockRefreshTrackedStockpileLists(...args),
}));

const { Stockpile, NotificationSubscription } = require('../../data/models.js');
const { checkExpiringStockpiles, start, formatWindowLabel } = require('../../utils/stockpileExpiryScheduler.js');

describe('stockpileExpiryScheduler.checkExpiringStockpiles', () => {
	const channelSend = jest.fn().mockResolvedValue(undefined);
	const mockChannel = { isSendable: () => true, send: channelSend };

	let client;

	beforeEach(() => {
		jest.clearAllMocks();
		Stockpile.find.mockReturnValue({ lean: jest.fn().mockResolvedValue([]) });
		NotificationSubscription.find.mockReturnValue({ lean: jest.fn().mockResolvedValue([]) });
		mockRefreshTrackedStockpileLists.mockResolvedValue(0);
		client = {
			traductions: new Map(),
			channels: { fetch: jest.fn().mockResolvedValue(mockChannel) },
		};
	});

	it('formatWindowLabel traduit ou retourne le label brut', () => {
		const translations = { translate: (key) => `T:${key}` };
		expect(formatWindowLabel('30m', translations)).toBe('T:NOTIFICATION_EXPIRING_IN_30M');
		expect(formatWindowLabel('unknown', translations)).toBe('unknown');
	});

	it('traite expiry_reminders_sent absent comme tableau vide', async () => {
		const expiresAt = new Date(Date.now() + 20 * 60 * 1000);
		Stockpile.find.mockReturnValue({
			lean: jest.fn().mockResolvedValue([{
				_id: 'stock-id-1',
				id: '1',
				name: 'Test',
				server_id: 'guild-1',
				owner_id: 'user-1',
				expiresAt,
			}]),
		});
		NotificationSubscription.find.mockReturnValue({
			lean: jest.fn().mockResolvedValue([{ guild_id: 'guild-1', channel_id: 'ch-1' }]),
		});

		await checkExpiringStockpiles(client);

		expect(channelSend).toHaveBeenCalled();
		expect(Stockpile.findByIdAndUpdate).toHaveBeenCalled();
	});

	it('does nothing when no stocks', async () => {
		await checkExpiringStockpiles(client);
		expect(NotificationSubscription.find).not.toHaveBeenCalled();
		expect(channelSend).not.toHaveBeenCalled();
	});

	it('sends only the closest due reminder per stock', async () => {
		const now = new Date();
		const expiresAt = new Date(now.getTime() + 20 * 60 * 1000);
		const stock = {
			_id: 'stock-id-1',
			id: '1',
			name: 'Test',
			server_id: 'guild-1',
			owner_id: 'owner-123',
			region: 'R',
			city: 'C',
			expiresAt,
			expiry_reminders_sent: [],
		};
		Stockpile.find.mockReturnValue({
			lean: jest.fn().mockResolvedValue([stock]),
		});
		NotificationSubscription.find.mockReturnValue({
			lean: jest.fn().mockResolvedValue([{ guild_id: 'guild-1', channel_id: 'ch-1' }]),
		});

		await checkExpiringStockpiles(client);

		expect(channelSend).toHaveBeenCalledTimes(1);
		const content = channelSend.mock.calls[0][0].content;
		expect(content).toContain('NOTIFICATION_EXPIRING_IN_30M');
		expect(content).not.toContain('NOTIFICATION_EXPIRING_IN_12H');
		expect(content).not.toContain('NOTIFICATION_EXPIRING_IN_1H');
		expect(mockTranslate).toHaveBeenCalledWith(
			'NOTIFICATION_STOCKPILE_EXPIRING_LINE',
			expect.objectContaining({
				creator: '<@owner-123> ',
				id: '1',
				window: expect.any(String),
			}),
		);
	});

	it('includes creator mention when owner_id is set and not legacy', async () => {
		const now = new Date();
		const expiresAt = new Date(now.getTime() + 15 * 60 * 1000);
		const stock = {
			_id: 'stock-id-1',
			id: '2',
			name: 'tesst',
			server_id: 'guild-1',
			owner_id: '201326790432653312',
			region: 'Region',
			city: 'Ville',
			expiresAt,
			expiry_reminders_sent: [],
		};
		Stockpile.find.mockReturnValue({
			lean: jest.fn().mockResolvedValue([stock]),
		});
		NotificationSubscription.find.mockReturnValue({
			lean: jest.fn().mockResolvedValue([{ guild_id: 'guild-1', channel_id: 'ch-1' }]),
		});

		await checkExpiringStockpiles(client);

		expect(mockTranslate).toHaveBeenCalledWith(
			'NOTIFICATION_STOCKPILE_EXPIRING_LINE',
			expect.objectContaining({
				creator: '<@201326790432653312> ',
			}),
		);
		const content = channelSend.mock.calls[0][0].content;
		expect(content).toContain('<@201326790432653312>');
	});

	it('omits creator mention when owner_id is legacy "0"', async () => {
		const now = new Date();
		const expiresAt = new Date(now.getTime() + 15 * 60 * 1000);
		const stock = {
			_id: 'stock-id-1',
			id: '2',
			name: 'legacy',
			server_id: 'guild-1',
			owner_id: '0',
			region: 'Unknown',
			city: 'Unknown',
			expiresAt,
			expiry_reminders_sent: [],
		};
		Stockpile.find.mockReturnValue({
			lean: jest.fn().mockResolvedValue([stock]),
		});
		NotificationSubscription.find.mockReturnValue({
			lean: jest.fn().mockResolvedValue([{ guild_id: 'guild-1', channel_id: 'ch-1' }]),
		});

		await checkExpiringStockpiles(client);

		expect(mockTranslate).toHaveBeenCalledWith(
			'NOTIFICATION_STOCKPILE_EXPIRING_LINE',
			expect.objectContaining({
				creator: '',
			}),
		);
		const content = channelSend.mock.calls[0][0].content;
		expect(content).not.toContain('<@0>');
	});

	it('adds all due intervals to expiry_reminders_sent (only notify for closest)', async () => {
		const now = new Date();
		const expiresAt = new Date(now.getTime() + 20 * 60 * 1000);
		const stock = {
			_id: 'stock-id-1',
			id: '1',
			name: 'Test',
			server_id: 'guild-1',
			owner_id: 'user-1',
			region: 'R',
			city: 'C',
			expiresAt,
			expiry_reminders_sent: [],
		};
		Stockpile.find.mockReturnValue({
			lean: jest.fn().mockResolvedValue([stock]),
		});
		NotificationSubscription.find.mockReturnValue({
			lean: jest.fn().mockResolvedValue([{ guild_id: 'guild-1', channel_id: 'ch-1' }]),
		});

		await checkExpiringStockpiles(client);

		// Only one message sent (30m)
		expect(channelSend).toHaveBeenCalledTimes(1);
		// But all due intervals (20 min left => 30m, 1h, 6h, 12h) are marked sent
		expect(Stockpile.findByIdAndUpdate).toHaveBeenCalledWith(
			'stock-id-1',
			expect.objectContaining({
				$addToSet: { expiry_reminders_sent: { $each: ['30m', '1h', '6h', '12h'] } },
			}),
		);
	});

	it('does not send when no subscription for guild', async () => {
		const now = new Date();
		const expiresAt = new Date(now.getTime() + 20 * 60 * 1000);
		const stock = {
			_id: 'stock-id-1',
			id: '1',
			name: 'Test',
			server_id: 'guild-1',
			owner_id: 'user-1',
			region: 'R',
			city: 'C',
			expiresAt,
			expiry_reminders_sent: [],
		};
		Stockpile.find.mockReturnValue({
			lean: jest.fn().mockResolvedValue([stock]),
		});
		NotificationSubscription.find.mockReturnValue({
			lean: jest.fn().mockResolvedValue([]),
		});

		await checkExpiringStockpiles(client);

		expect(channelSend).not.toHaveBeenCalled();
	});

	it('does nothing when all reminders already sent for stocks', async () => {
		const now = new Date();
		const expiresAt = new Date(now.getTime() + 20 * 60 * 1000);
		const stock = {
			_id: 'stock-id-1',
			id: '1',
			name: 'Test',
			server_id: 'guild-1',
			owner_id: 'user-1',
			region: 'R',
			city: 'C',
			expiresAt,
			expiry_reminders_sent: ['30m', '1h', '6h', '12h'],
		};
		Stockpile.find.mockReturnValue({
			lean: jest.fn().mockResolvedValue([stock]),
		});

		await checkExpiringStockpiles(client);

		expect(NotificationSubscription.find).not.toHaveBeenCalled();
		expect(channelSend).not.toHaveBeenCalled();
	});

	it('skips send when channel fetch fails', async () => {
		const expiresAt = new Date(Date.now() + 20 * 60 * 1000);
		const stock = {
			_id: 'stock-id-1',
			id: '1',
			name: 'Test',
			server_id: 'guild-1',
			owner_id: 'user-1',
			region: 'R',
			city: 'C',
			expiresAt,
			expiry_reminders_sent: [],
		};
		Stockpile.find.mockReturnValue({
			lean: jest.fn().mockResolvedValue([stock]),
		});
		NotificationSubscription.find.mockReturnValue({
			lean: jest.fn().mockResolvedValue([{ guild_id: 'guild-1', channel_id: 'ch-1' }]),
		});
		client.channels.fetch.mockResolvedValue(null);

		await checkExpiringStockpiles(client);

		expect(channelSend).not.toHaveBeenCalled();
	});

	it('skips send when channel is not sendable', async () => {
		const expiresAt = new Date(Date.now() + 20 * 60 * 1000);
		const stock = {
			_id: 'stock-id-1',
			id: '1',
			name: 'Test',
			server_id: 'guild-1',
			owner_id: 'user-1',
			region: 'R',
			city: 'C',
			expiresAt,
			expiry_reminders_sent: [],
		};
		Stockpile.find.mockReturnValue({
			lean: jest.fn().mockResolvedValue([stock]),
		});
		NotificationSubscription.find.mockReturnValue({
			lean: jest.fn().mockResolvedValue([{ guild_id: 'guild-1', channel_id: 'ch-1' }]),
		});
		client.channels.fetch.mockResolvedValue({ isSendable: () => false, send: channelSend });

		await checkExpiringStockpiles(client);

		expect(channelSend).not.toHaveBeenCalled();
	});

	it('rafraîchit les listes stockpile trackées quand des rappels sont envoyés', async () => {
		const expiresAt = new Date(Date.now() + 20 * 60 * 1000);
		const stock = {
			_id: 'stock-id-1',
			id: '1',
			name: 'Test',
			server_id: 'guild-1',
			owner_id: 'user-1',
			region: 'R',
			city: 'C',
			expiresAt,
			expiry_reminders_sent: [],
		};

		Stockpile.find.mockReturnValue({
			lean: jest.fn().mockResolvedValue([stock]),
		});
		NotificationSubscription.find.mockReturnValue({
			lean: jest.fn().mockResolvedValue([{ guild_id: 'guild-1', channel_id: 'ch-1' }]),
		});
		client.channels.fetch.mockResolvedValue({ ...mockChannel, send: channelSend });

		await checkExpiringStockpiles(client);

		expect(mockRefreshTrackedStockpileLists).toHaveBeenCalledWith(client, { guildIds: ['guild-1'] });
	});

	it('logs en APP_ENV=dev pendant checkExpiringStockpiles', async () => {
		const prev = process.env.APP_ENV;
		process.env.APP_ENV = 'dev';
		const logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
		const expiresAt = new Date(Date.now() + 20 * 60 * 1000);
		const stock = {
			_id: 'stock-id-1',
			id: '1',
			name: 'Test',
			server_id: 'guild-1',
			owner_id: 'user-1',
			region: 'R',
			city: 'C',
			expiresAt: expiresAt.toISOString(),
			expiry_reminders_sent: [],
		};
		Stockpile.find.mockReturnValue({ lean: jest.fn().mockResolvedValue([stock]) });
		NotificationSubscription.find.mockReturnValue({
			lean: jest.fn().mockResolvedValue([{ guild_id: 'guild-1', channel_id: 'ch-1' }]),
		});

		await checkExpiringStockpiles(client);

		expect(logSpy.mock.calls.some((c) => String(c[0]).includes('[stockpileExpiryScheduler] check ran'))).toBe(true);
		expect(logSpy.mock.calls.some((c) => String(c[0]).includes('sending'))).toBe(true);
		logSpy.mockRestore();
		process.env.APP_ENV = prev;
	});

	it('log dev quand aucun channel abonné pour un guild', async () => {
		const prev = process.env.APP_ENV;
		process.env.APP_ENV = 'dev';
		const logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
		const expiresAt = new Date(Date.now() + 20 * 60 * 1000);
		Stockpile.find.mockReturnValue({
			lean: jest.fn().mockResolvedValue([{
				_id: 'stock-id-1',
				id: '1',
				name: 'Test',
				server_id: 'guild-orphan',
				owner_id: 'user-1',
				region: 'R',
				city: 'C',
				expiresAt,
				expiry_reminders_sent: [],
			}]),
		});
		NotificationSubscription.find.mockReturnValue({ lean: jest.fn().mockResolvedValue([]) });

		await checkExpiringStockpiles(client);

		expect(logSpy.mock.calls.some((c) => String(c[0]).includes('no channel subscribed'))).toBe(true);
		logSpy.mockRestore();
		process.env.APP_ENV = prev;
	});

	it('ignore les stocks déjà expirés (minutesLeft <= 0)', async () => {
		const expiresAt = new Date(Date.now() - 1000);
		Stockpile.find.mockReturnValue({
			lean: jest.fn().mockResolvedValue([{
				_id: 'stock-id-1',
				id: '1',
				name: 'Test',
				server_id: 'guild-1',
				owner_id: 'user-1',
				expiresAt,
				expiry_reminders_sent: [],
			}]),
		});

		await checkExpiringStockpiles(client);

		expect(NotificationSubscription.find).not.toHaveBeenCalled();
	});

	it('utilise le label window brut si clé inconnue', async () => {
		const expiresAt = new Date(Date.now() + 20 * 60 * 1000);
		Stockpile.find.mockReturnValue({
			lean: jest.fn().mockResolvedValue([{
				_id: 'stock-id-1',
				id: '1',
				name: 'Test',
				server_id: 'guild-1',
				owner_id: null,
				region: '',
				city: '',
				expiresAt,
				expiry_reminders_sent: [],
			}]),
		});
		NotificationSubscription.find.mockReturnValue({
			lean: jest.fn().mockResolvedValue([{ guild_id: 'guild-1', channel_id: 'ch-1' }]),
		});
		mockTranslate.mockImplementation((key, params = {}) => {
			if (key === 'NOTIFICATION_STOCKPILE_EXPIRING_LINE') return `window=${params.window}`;
			return key;
		});

		await checkExpiringStockpiles(client);

		expect(channelSend).toHaveBeenCalled();
	});

	it('continues when channel.send throws', async () => {
		const expiresAt = new Date(Date.now() + 20 * 60 * 1000);
		const stock = {
			_id: 'stock-id-1',
			id: '1',
			name: 'Test',
			server_id: 'guild-1',
			owner_id: 'user-1',
			region: 'R',
			city: 'C',
			expiresAt,
			expiry_reminders_sent: [],
		};
		Stockpile.find.mockReturnValue({
			lean: jest.fn().mockResolvedValue([stock]),
		});
		NotificationSubscription.find.mockReturnValue({
			lean: jest.fn().mockResolvedValue([{ guild_id: 'guild-1', channel_id: 'ch-1' }]),
		});
		channelSend.mockRejectedValue(new Error('send failed'));

		await expect(checkExpiringStockpiles(client)).resolves.not.toThrow();
		expect(Stockpile.findByIdAndUpdate).toHaveBeenCalled();
	});

	it('ignore subscription guild sans items correspondants', async () => {
		const expiresAt = new Date(Date.now() + 20 * 60 * 1000);
		Stockpile.find.mockReturnValue({
			lean: jest.fn().mockResolvedValue([{
				_id: 'stock-id-1',
				id: '1',
				name: 'Test',
				server_id: 'guild-1',
				owner_id: 'user-1',
				expiresAt,
				expiry_reminders_sent: [],
			}]),
		});
		NotificationSubscription.find.mockReturnValue({
			lean: jest.fn().mockResolvedValue([{ guild_id: 'other-guild', channel_id: 'ch-1' }]),
		});

		await checkExpiringStockpiles(client);

		expect(channelSend).not.toHaveBeenCalled();
		expect(Stockpile.findByIdAndUpdate).toHaveBeenCalled();
	});

	it('dedupe toUpdate pour plusieurs stocks même id', async () => {
		const expiresAt = new Date(Date.now() + 20 * 60 * 1000);
		const stock = {
			_id: 'stock-id-1',
			id: '1',
			name: 'Test',
			server_id: 'guild-1',
			owner_id: 'user-1',
			expiresAt,
			expiry_reminders_sent: [],
		};
		Stockpile.find.mockReturnValue({ lean: jest.fn().mockResolvedValue([stock, stock]) });
		NotificationSubscription.find.mockReturnValue({
			lean: jest.fn().mockResolvedValue([{ guild_id: 'guild-1', channel_id: 'ch-1' }]),
		});

		await checkExpiringStockpiles(client);

		expect(Stockpile.findByIdAndUpdate).toHaveBeenCalledTimes(1);
	});

	it('expiresAt string ISO est accepté', async () => {
		const expiresAt = new Date(Date.now() + 20 * 60 * 1000).toISOString();
		Stockpile.find.mockReturnValue({
			lean: jest.fn().mockResolvedValue([{
				_id: 'stock-id-1',
				id: '1',
				name: 'Test',
				server_id: 'guild-1',
				owner_id: '0',
				expiresAt,
				expiry_reminders_sent: [],
			}]),
		});
		NotificationSubscription.find.mockReturnValue({
			lean: jest.fn().mockResolvedValue([{ guild_id: 'guild-1', channel_id: 'ch-1' }]),
		});

		await checkExpiringStockpiles(client);

		expect(channelSend).toHaveBeenCalled();
	});
});

describe('stockpileExpiryScheduler.start', () => {
	it('schedules checkExpiringStockpiles via setTimeout and setInterval', () => {
		const setTimeoutSpy = jest.spyOn(global, 'setTimeout');
		const setIntervalSpy = jest.spyOn(global, 'setInterval');
		const client = { channels: { fetch: jest.fn() } };

		start(client);

		expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), 60 * 1000);
		expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), 5 * 60 * 1000);

		setTimeoutSpy.mockRestore();
		setIntervalSpy.mockRestore();
	});

	it('invoke les callbacks setTimeout/setInterval', async () => {
		jest.useFakeTimers();
		Stockpile.find.mockReturnValue({ lean: jest.fn().mockResolvedValue([]) });
		const errSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
		const client = { channels: { fetch: jest.fn() } };

		start(client);
		await jest.advanceTimersByTimeAsync(60 * 1000);
		await jest.advanceTimersByTimeAsync(5 * 60 * 1000);

		expect(Stockpile.find).toHaveBeenCalled();
		errSpy.mockRestore();
		jest.useRealTimers();
	});

	it('unrefs timers so they do not keep process alive', () => {
		const origSetTimeout = global.setTimeout;
		const origSetInterval = global.setInterval;
		const mockUnref = jest.fn();
		const setTimeoutSpy = jest.spyOn(global, 'setTimeout').mockImplementation((fn, ms) => {
			const t = origSetTimeout(fn, ms);
			t.unref = mockUnref;
			return t;
		});
		const setIntervalSpy = jest.spyOn(global, 'setInterval').mockImplementation((fn, ms) => {
			const i = origSetInterval(fn, ms);
			i.unref = mockUnref;
			return i;
		});
		const client = { channels: { fetch: jest.fn() } };

		start(client);

		expect(mockUnref).toHaveBeenCalledTimes(2);

		setTimeoutSpy.mockRestore();
		setIntervalSpy.mockRestore();
	});

	it('start log erreur si checkExpiringStockpiles reject', async () => {
		jest.useFakeTimers();
		Stockpile.find.mockReturnValue({
			lean: jest.fn().mockRejectedValue(new Error('db fail')),
		});
		const errSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
		const client = { channels: { fetch: jest.fn() } };

		start(client);
		await jest.advanceTimersByTimeAsync(60 * 1000);

		expect(errSpy.mock.calls.some((c) => String(c[0]).includes('stockpileExpiryScheduler'))).toBe(true);
		errSpy.mockRestore();
		jest.useRealTimers();
	});

	it('start log erreur si interval checkExpiringStockpiles reject', async () => {
		jest.useFakeTimers();
		Stockpile.find.mockReturnValue({
			lean: jest.fn()
				.mockResolvedValueOnce([])
				.mockRejectedValueOnce(new Error('interval fail')),
		});
		const errSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
		const client = { channels: { fetch: jest.fn() } };

		start(client);
		await jest.advanceTimersByTimeAsync(60 * 1000);
		await jest.advanceTimersByTimeAsync(5 * 60 * 1000);

		expect(errSpy.mock.calls.some((c) => String(c.join(' ')).includes('interval fail'))).toBe(true);
		errSpy.mockRestore();
		jest.useRealTimers();
	});

	it('channels.fetch reject invoke catch callback', async () => {
		const expiresAt = new Date(Date.now() + 20 * 60 * 1000);
		Stockpile.find.mockReturnValue({
			lean: jest.fn().mockResolvedValue([{
				_id: 'stock-id-1',
				id: '1',
				name: 'Test',
				server_id: 'guild-1',
				owner_id: 'user-1',
				expiresAt,
				expiry_reminders_sent: [],
			}]),
		});
		NotificationSubscription.find.mockReturnValue({
			lean: jest.fn().mockResolvedValue([{ guild_id: 'guild-1', channel_id: 'ch-1' }]),
		});
		const client = {
			channels: {
				fetch: jest.fn().mockReturnValue(Promise.reject(new Error('fetch fail'))),
			},
		};
		await expect(checkExpiringStockpiles(client)).resolves.not.toThrow();
	});
});
