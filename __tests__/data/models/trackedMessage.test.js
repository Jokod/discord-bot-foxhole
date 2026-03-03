const TrackedMessage = require('../../../data/models/trackedMessage.js');

describe('TrackedMessage Model', () => {
	describe('Schema', () => {
		it('should have required fields', () => {
			const doc = new TrackedMessage();
			const err = doc.validateSync();
			expect(err.errors.server_id).toBeDefined();
			expect(err.errors.channel_id).toBeDefined();
			expect(err.errors.message_type).toBeDefined();
			expect(err.errors.message_id).toBeDefined();
		});

		it('should create a valid document', () => {
			const doc = new TrackedMessage({
				server_id: 'guild-123',
				channel_id: 'channel-456',
				message_type: 'stockpile_list',
				message_id: 'msg-789',
			});
			expect(doc.validateSync()).toBeUndefined();
			expect(doc.server_id).toBe('guild-123');
			expect(doc.channel_id).toBe('channel-456');
			expect(doc.message_type).toBe('stockpile_list');
			expect(doc.message_id).toBe('msg-789');
		});

		it('should have unique compound index', () => {
			const indexes = TrackedMessage.schema.indexes();
			expect(indexes.some((idx) => idx[0].server_id === 1 && idx[0].channel_id === 1 && idx[0].message_type === 1)).toBe(true);
		});
	});
});
