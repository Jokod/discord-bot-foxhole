const NotificationSubscription = require('../../../data/models/notificationSubscription.js');

describe('NotificationSubscription Model', () => {
	describe('Schema', () => {
		it('should have required fields', () => {
			const doc = new NotificationSubscription();
			const err = doc.validateSync();
			expect(err.errors.guild_id).toBeDefined();
			expect(err.errors.channel_id).toBeDefined();
			expect(err.errors.notification_type).toBeDefined();
		});

		it('should create a valid document', () => {
			const doc = new NotificationSubscription({
				guild_id: 'guild-123',
				channel_id: 'channel-456',
				notification_type: 'stockpile_activity',
			});
			expect(doc.validateSync()).toBeUndefined();
			expect(doc.guild_id).toBe('guild-123');
			expect(doc.channel_id).toBe('channel-456');
			expect(doc.notification_type).toBe('stockpile_activity');
		});

		it('should accept stockpile_expiring as notification_type', () => {
			const doc = new NotificationSubscription({
				guild_id: 'g1',
				channel_id: 'c1',
				notification_type: 'stockpile_expiring',
			});
			expect(doc.validateSync()).toBeUndefined();
		});

		it('should reject invalid notification_type', () => {
			const doc = new NotificationSubscription({
				guild_id: 'g1',
				channel_id: 'c1',
				notification_type: 'invalid',
			});
			const err = doc.validateSync();
			expect(err.errors.notification_type).toBeDefined();
		});

		it('should have unique compound index', () => {
			const indexes = NotificationSubscription.schema.indexes();
			expect(indexes.some((idx) => idx[0].guild_id === 1 && idx[0].channel_id === 1 && idx[0].notification_type === 1)).toBe(true);
		});
	});
});
