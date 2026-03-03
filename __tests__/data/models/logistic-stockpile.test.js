const Stockpile = require('../../../data/models/logistic/stockpile.js');

describe('Stockpile Model', () => {
	describe('Schema', () => {
		it('should have required fields', () => {
			const doc = new Stockpile();
			const err = doc.validateSync();
			expect(err.errors.id).toBeDefined();
			expect(err.errors.server_id).toBeDefined();
			expect(err.errors.name).toBeDefined();
			expect(err.errors.password).toBeDefined();
			expect(err.errors.region).toBeDefined();
			expect(err.errors.city).toBeDefined();
			expect(err.errors.group_id).toBeDefined();
			expect(err.errors.owner_id).toBeDefined();
			expect(err.errors.lastResetAt).toBeDefined();
			expect(err.errors.expiresAt).toBeDefined();
		});

		it('should create a valid document', () => {
			const now = new Date();
			const doc = new Stockpile({
				id: '1',
				server_id: 'guild-123',
				name: 'Depot Alpha',
				password: 'code123',
				region: 'Region',
				city: 'City',
				group_id: 'channel-456',
				owner_id: 'user-789',
				lastResetAt: now,
				expiresAt: new Date(now.getTime() + 86400000),
			});
			expect(doc.validateSync()).toBeUndefined();
			expect(doc.id).toBe('1');
			expect(doc.server_id).toBe('guild-123');
			expect(doc.deleted).toBe(false);
			expect(doc.expiry_reminders_sent).toEqual([]);
		});

		it('should have default deleted false and expiry_reminders_sent empty', () => {
			const now = new Date();
			const doc = new Stockpile({
				id: '1',
				server_id: 'g1',
				name: 'Depot',
				password: 'pwd',
				region: 'r',
				city: 'c',
				group_id: 'ch1',
				owner_id: 'u1',
				lastResetAt: now,
				expiresAt: new Date(now.getTime() + 86400000),
			});
			expect(doc.deleted).toBe(false);
			expect(doc.expiry_reminders_sent).toEqual([]);
		});

		it('should accept optional deletedAt when deleted', () => {
			const now = new Date();
			const doc = new Stockpile({
				id: '1',
				server_id: 'g1',
				name: 'Depot',
				password: 'pwd',
				region: 'r',
				city: 'c',
				group_id: 'ch1',
				owner_id: 'u1',
				lastResetAt: now,
				expiresAt: new Date(now.getTime() + 86400000),
				deleted: true,
				deletedAt: now,
			});
			expect(doc.validateSync()).toBeUndefined();
			expect(doc.deleted).toBe(true);
		});
	});
});
