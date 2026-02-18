const mockTranslate = jest.fn((key, params = {}) => {
	const parts = Object.entries(params).map(([k, v]) => `${k}=${v}`);
	return [key, ...parts].join(' ');
});

jest.mock('../../utils/translations.js', () => jest.fn().mockImplementation(() => ({ translate: mockTranslate })));
jest.mock('../../utils/formatLocation.js', () => ({ formatForDisplay: (x) => x || '' }));

const mockFind = jest.fn();
const mockFindByIdAndUpdate = jest.fn();

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

const { Stockpile, NotificationSubscription } = require('../../data/models.js');
const { checkExpiringStockpiles } = require('../../utils/stockpileExpiryScheduler.js');

describe('stockpileExpiryScheduler.checkExpiringStockpiles', () => {
	const channelSend = jest.fn().mockResolvedValue(undefined);
	const mockChannel = { isSendable: () => true, send: channelSend };

	let client;

	beforeEach(() => {
		jest.clearAllMocks();
		Stockpile.find.mockReturnValue({ lean: jest.fn().mockResolvedValue([]) });
		NotificationSubscription.find.mockReturnValue({ lean: jest.fn().mockResolvedValue([]) });
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
});
