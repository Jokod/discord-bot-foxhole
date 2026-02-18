const mockFind = jest.fn();
const mockTranslate = jest.fn((key) => key);

jest.mock('../../data/models.js', () => ({
	NotificationSubscription: {
		find: (...args) => mockFind(...args),
	},
}));
jest.mock('../../utils/translations.js', () => jest.fn().mockImplementation(() => ({ translate: mockTranslate })));

describe('notifications utility', () => {
	let notifications;

	beforeEach(() => {
		jest.clearAllMocks();
		notifications = require('../../utils/notifications.js');
	});

	describe('getSubscriptions', () => {
		it('retourne les channel_id des abonnements', async () => {
			mockFind.mockReturnValue({
				lean: jest.fn().mockResolvedValue([
					{ channel_id: 'ch1' },
					{ channel_id: 'ch2' },
				]),
			});

			const result = await notifications.getSubscriptions('guild-1', 'stockpile_activity');

			expect(mockFind).toHaveBeenCalledWith({ guild_id: 'guild-1', notification_type: 'stockpile_activity' });
			expect(result).toEqual([{ channel_id: 'ch1' }, { channel_id: 'ch2' }]);
		});

		it('retourne un tableau vide si aucun abonnement', async () => {
			mockFind.mockReturnValue({ lean: jest.fn().mockResolvedValue([]) });

			const result = await notifications.getSubscriptions('guild-1', 'stockpile_expiring');

			expect(result).toEqual([]);
		});
	});

	describe('sendToSubscribers', () => {
		it('ne fait rien si aucun abonnement', async () => {
			mockFind.mockReturnValue({ lean: jest.fn().mockResolvedValue([]) });
			const buildPayload = jest.fn();
			const client = { channels: { fetch: jest.fn() } };

			await notifications.sendToSubscribers(client, 'guild-1', 'stockpile_activity', buildPayload);

			expect(buildPayload).not.toHaveBeenCalled();
			expect(client.channels.fetch).not.toHaveBeenCalled();
		});

		it('envoie aux canaux abonnés', async () => {
			mockFind.mockReturnValue({
				lean: jest.fn().mockResolvedValue([{ channel_id: 'ch1' }, { channel_id: 'ch2' }]),
			});
			const buildPayload = jest.fn().mockReturnValue({ content: 'Test' });
			const mockSend = jest.fn().mockResolvedValue(undefined);
			const client = {
				channels: {
					fetch: jest.fn()
						.mockResolvedValueOnce({ isSendable: () => true, send: mockSend })
						.mockResolvedValueOnce({ isSendable: () => true, send: mockSend }),
				},
			};

			await notifications.sendToSubscribers(client, 'guild-1', 'stockpile_activity', buildPayload);

			expect(buildPayload).toHaveBeenCalled();
			expect(client.channels.fetch).toHaveBeenCalledWith('ch1');
			expect(client.channels.fetch).toHaveBeenCalledWith('ch2');
			expect(mockSend).toHaveBeenCalledTimes(2);
		});

		it('ignore les canaux non sendable', async () => {
			mockFind.mockReturnValue({
				lean: jest.fn().mockResolvedValue([{ channel_id: 'ch1' }]),
			});
			const buildPayload = jest.fn().mockReturnValue({ content: 'Test' });
			const mockSend = jest.fn();
			const client = {
				channels: {
					fetch: jest.fn().mockResolvedValue({ isSendable: () => false, send: mockSend }),
				},
			};

			await notifications.sendToSubscribers(client, 'guild-1', 'stockpile_activity', buildPayload);

			expect(mockSend).not.toHaveBeenCalled();
		});

		it('continue si un canal échoue (fetch null)', async () => {
			mockFind.mockReturnValue({
				lean: jest.fn().mockResolvedValue([{ channel_id: 'ch1' }, { channel_id: 'ch2' }]),
			});
			const buildPayload = jest.fn().mockReturnValue({ content: 'Test' });
			const mockSend = jest.fn().mockResolvedValue(undefined);
			const client = {
				channels: {
					fetch: jest.fn()
						.mockResolvedValueOnce(null)
						.mockResolvedValueOnce({ isSendable: () => true, send: mockSend }),
				},
			};

			await notifications.sendToSubscribers(client, 'guild-1', 'stockpile_activity', buildPayload);

			expect(mockSend).toHaveBeenCalledTimes(1);
		});
	});
});
