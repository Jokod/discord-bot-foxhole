const Group = require('../../../data/models/logistic/group.js');

describe('Group Model', () => {
	describe('Schema', () => {
		it('should have required fields', () => {
			const doc = new Group();
			const err = doc.validateSync();
			expect(err.errors.threadId).toBeDefined();
			expect(err.errors.guild_id).toBeDefined();
			expect(err.errors.operation_id).toBeDefined();
			expect(err.errors.owner_id).toBeDefined();
		});

		it('should create a valid document', () => {
			const doc = new Group({
				threadId: 'thread-123',
				guild_id: 'guild-456',
				operation_id: 'op-789',
				owner_id: 'user-999',
			});
			expect(doc.validateSync()).toBeUndefined();
			expect(doc.threadId).toBe('thread-123');
			expect(doc.guild_id).toBe('guild-456');
			expect(doc.operation_id).toBe('op-789');
			expect(doc.owner_id).toBe('user-999');
		});

		it('should have correct field types', () => {
			const schema = Group.schema;
			expect(schema.path('threadId').instance).toBe('String');
			expect(schema.path('guild_id').instance).toBe('String');
			expect(schema.path('operation_id').instance).toBe('String');
			expect(schema.path('owner_id').instance).toBe('String');
		});
	});
});
