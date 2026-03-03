const Material = require('../../../data/models/logistic/material.js');

describe('Material Model', () => {
	describe('Schema', () => {
		it('should have required fields', () => {
			const doc = new Material();
			const err = doc.validateSync();
			expect(err.errors.material_id).toBeDefined();
			expect(err.errors.guild_id).toBeDefined();
			expect(err.errors.status).toBeDefined();
		});

		it('should create a valid document with required fields only', () => {
			const doc = new Material({
				material_id: 'mat-123',
				guild_id: 'guild-456',
				status: 'pending',
			});
			expect(doc.validateSync()).toBeUndefined();
			expect(doc.material_id).toBe('mat-123');
			expect(doc.guild_id).toBe('guild-456');
			expect(doc.status).toBe('pending');
			expect(doc.quantityAsk).toBe(0);
			expect(doc.quantityGiven).toBe(0);
			expect(doc.priority).toBe('neutral');
		});

		it('should have default priority neutral', () => {
			const doc = new Material({
				material_id: 'm1',
				guild_id: 'g1',
				status: 'pending',
			});
			expect(doc.priority).toBe('neutral');
		});

		it('should accept priority enum values', () => {
			for (const p of ['low', 'neutral', 'high']) {
				const doc = new Material({
					material_id: 'm1',
					guild_id: 'g1',
					status: 'pending',
					priority: p,
				});
				expect(doc.validateSync()).toBeUndefined();
				expect(doc.priority).toBe(p);
			}
		});

		it('should reject invalid priority', () => {
			const doc = new Material({
				material_id: 'm1',
				guild_id: 'g1',
				status: 'pending',
				priority: 'invalid',
			});
			const err = doc.validateSync();
			expect(err.errors.priority).toBeDefined();
		});

		it('should accept optional fields', () => {
			const doc = new Material({
				material_id: 'm1',
				guild_id: 'g1',
				group_id: 'grp-1',
				owner_id: 'owner-1',
				person_id: 'person-1',
				name: 'Bmat',
				quantityAsk: 100,
				quantityGiven: 50,
				localization: 'Depot A',
				status: 'in_progress',
				priority: 'high',
			});
			expect(doc.validateSync()).toBeUndefined();
			expect(doc.group_id).toBe('grp-1');
			expect(doc.owner_id).toBe('owner-1');
			expect(doc.name).toBe('Bmat');
			expect(doc.quantityAsk).toBe(100);
			expect(doc.quantityGiven).toBe(50);
			expect(doc.localization).toBe('Depot A');
		});
	});
});
