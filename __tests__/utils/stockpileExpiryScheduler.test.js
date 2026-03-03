const mockTranslate = jest.fn((key, params = {}) => {
	const parts = Object.entries(params).map(([k, v]) => `${k}=${v}`);
	return [key, ...parts].join(' ');
});

jest.mock('../../utils/translations.js', () => jest.fn().mockImplementation(() => ({ translate: mockTranslate })));
jest.mock('../../utils/formatLocation.js', () => ({ formatForDisplay: (x) => x || '' }));

const mockFind = jest.fn();
const mockFindByIdAndUpdate = jest.fn();
const mockBuildStockpileListEmbed = jest.fn();
const mockBuildStockpileListComponents = jest.fn();

jest.mock('../../data/models.js', () => ({
	Stockpile: {
		find: jest.fn().mockReturnValue({ lean: jest.fn() }),
		findByIdAndUpdate: mockFindByIdAndUpdate,
		deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
	},
	NotificationSubscription: {
		find: jest.fn().mockReturnValue({ lean: jest.fn() }),
	},
	TrackedMessage: {
		find: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue([]) }),
	},
}));

jest.mock('../../interactions/embeds/stockpileList.js', () => ({
	buildStockpileListEmbed: (...args) => mockBuildStockpileListEmbed(...args),
	buildStockpileListComponents: (...args) => mockBuildStockpileListComponents(...args),
}));

const { Stockpile, NotificationSubscription, TrackedMessage } = require('../../data/models.js');
const { checkExpiringStockpiles, start } = require('../../utils/stockpileExpiryScheduler.js');

describe('stockpileExpiryScheduler.checkExpiringStockpiles', () => {
	const channelSend = jest.fn().mockResolvedValue(undefined);
	const mockChannel = { isSendable: () => true, send: channelSend };

	let client;

	beforeEach(() => {
		jest.clearAllMocks();
		Stockpile.find.mockReturnValue({ lean: jest.fn().mockResolvedValue([]) });
		NotificationSubscription.find.mockReturnValue({ lean: jest.fn().mockResolvedValue([]) });
		TrackedMessage.find.mockReturnValue({ lean: jest.fn().mockResolvedValue([]) });
		mockBuildStockpileListEmbed.mockResolvedValue({ embed: { data: {} }, isEmpty: false });
		mockBuildStockpileListComponents.mockResolvedValue([]);
		client = {
			traductions: new Map(),
			channels: { fetch: jest.fn().mockResolvedValue(mockChannel) },
		};
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
		// But all due intervals (20 min left => 30m, 1h, 2h, 3h, 6h, 12h) are marked sent
		expect(Stockpile.findByIdAndUpdate).toHaveBeenCalledWith(
			'stock-id-1',
			expect.objectContaining({
				$addToSet: { expiry_reminders_sent: { $each: ['30m', '1h', '2h', '3h', '6h', '12h'] } },
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
			expiry_reminders_sent: ['30m', '1h', '2h', '3h', '6h', '12h'],
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

	it('updates tracked stockpile list messages when there are reminders to send', async () => {
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
		const mockMsgEdit = jest.fn().mockResolvedValue(undefined);
		const mockMessagesFetch = jest.fn().mockResolvedValue({ edit: mockMsgEdit });
		const textChannel = {
			isSendable: () => true,
			send: channelSend,
			isTextBased: () => true,
			messages: { fetch: mockMessagesFetch },
		};

		Stockpile.find.mockReturnValue({
			lean: jest.fn().mockResolvedValue([stock]),
		});
		NotificationSubscription.find.mockReturnValue({
			lean: jest.fn().mockResolvedValue([{ guild_id: 'guild-1', channel_id: 'ch-1' }]),
		});
		TrackedMessage.find.mockReturnValue({
			lean: jest.fn().mockResolvedValue([
				{ server_id: 'guild-1', channel_id: 'ch-tracked', message_id: 'msg-1', message_type: 'stockpile_list' },
			]),
		});
		mockBuildStockpileListEmbed.mockResolvedValue({ embed: { data: {} }, isEmpty: false });
		client.channels.fetch.mockImplementation((id) =>
			Promise.resolve(id === 'ch-1' ? { ...mockChannel, send: channelSend } : textChannel),
		);

		await checkExpiringStockpiles(client);

		expect(mockBuildStockpileListEmbed).toHaveBeenCalledWith(Stockpile, 'guild-1', expect.anything());
		expect(mockBuildStockpileListComponents).toHaveBeenCalledWith(Stockpile, 'guild-1');
		expect(mockMessagesFetch).toHaveBeenCalledWith('msg-1');
		expect(mockMsgEdit).toHaveBeenCalledWith(expect.objectContaining({ embeds: expect.any(Array), components: expect.any(Array) }));
	});

	it('edits tracked list with STOCKPILE_LIST_EMPTY when isEmpty', async () => {
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
		const mockMsgEdit = jest.fn().mockResolvedValue(undefined);
		const mockMessagesFetch = jest.fn().mockResolvedValue({ edit: mockMsgEdit });
		const textChannel = {
			isSendable: () => true,
			send: channelSend,
			isTextBased: () => true,
			messages: { fetch: mockMessagesFetch },
		};

		Stockpile.find.mockReturnValue({
			lean: jest.fn().mockResolvedValue([stock]),
		});
		NotificationSubscription.find.mockReturnValue({
			lean: jest.fn().mockResolvedValue([{ guild_id: 'guild-1', channel_id: 'ch-1' }]),
		});
		TrackedMessage.find.mockReturnValue({
			lean: jest.fn().mockResolvedValue([
				{ server_id: 'guild-1', channel_id: 'ch-tracked', message_id: 'msg-1', message_type: 'stockpile_list' },
			]),
		});
		mockBuildStockpileListEmbed.mockResolvedValue({ embed: null, isEmpty: true });
		client.channels.fetch.mockImplementation((id) =>
			Promise.resolve(id === 'ch-1' ? { ...mockChannel, send: channelSend } : textChannel),
		);

		await checkExpiringStockpiles(client);

		expect(mockMsgEdit).toHaveBeenCalledWith(
			expect.objectContaining({
				content: 'STOCKPILE_LIST_EMPTY',
				embeds: [],
				components: [],
			}),
		);
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
});
