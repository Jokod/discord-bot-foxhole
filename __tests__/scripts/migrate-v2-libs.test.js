'use strict';

const { purgeLogistics } = require('../../scripts/lib/migrate-v2/purge-logistics.js');
const { migrateStockpileChannelId } = require('../../scripts/lib/migrate-v2/stockpile-channel-id.js');
const { cleanupStats } = require('../../scripts/lib/migrate-v2/stats-cleanup.js');

function mockCollection(overrides = {}) {
	return {
		countDocuments: jest.fn().mockResolvedValue(0),
		find: jest.fn().mockReturnValue({ toArray: async () => [] }),
		deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
		updateOne: jest.fn().mockResolvedValue({}),
		updateMany: jest.fn().mockResolvedValue({}),
		drop: jest.fn().mockResolvedValue(undefined),
		...overrides,
	};
}

describe('migrate-v2 libs', () => {
	describe('purgeLogistics', () => {
		it('dry-run compte sans écrire', async () => {
			const materials = mockCollection({ countDocuments: jest.fn().mockResolvedValue(3) });
			const stocks = mockCollection({ countDocuments: jest.fn().mockResolvedValue(2) });
			const groups = mockCollection({ countDocuments: jest.fn().mockResolvedValue(1) });
			const tracked = mockCollection({
				find: jest.fn().mockReturnValue({
					toArray: async () => [
						{ _id: 1, message_type: 'stock_summary:x' },
						{ _id: 2, message_type: 'stockpile_list' },
						{ _id: 3, message_type: 'order_board:y' },
					],
				}),
			});
			const db = {
				collection: jest.fn((name) => {
					if (name === 'materials') return materials;
					if (name === 'stocks') return stocks;
					if (name === 'groups') return groups;
					if (name === 'trackedmessages') return tracked;
					return mockCollection();
				}),
				listCollections: jest.fn().mockReturnValue({ hasNext: async () => true }),
			};

			const result = await purgeLogistics(db, { dryRun: true });
			expect(result.materialsDeleted).toBe(3);
			expect(result.stocksDeleted).toBe(2);
			expect(result.trackedDeleted).toBe(1);
			expect(materials.deleteMany).not.toHaveBeenCalled();
			expect(groups.drop).not.toHaveBeenCalled();
		});

		it('applique deleteMany et drop groups', async () => {
			const materials = mockCollection({
				countDocuments: jest.fn().mockResolvedValue(1),
				deleteMany: jest.fn().mockResolvedValue({ deletedCount: 1 }),
			});
			const stocks = mockCollection({
				countDocuments: jest.fn().mockResolvedValue(1),
				deleteMany: jest.fn().mockResolvedValue({ deletedCount: 1 }),
			});
			const groups = mockCollection({ countDocuments: jest.fn().mockResolvedValue(0) });
			const tracked = mockCollection({
				find: jest.fn().mockReturnValue({
					toArray: async () => [{ _id: 'a', message_type: 'stock_panel:1' }],
				}),
				deleteMany: jest.fn().mockResolvedValue({ deletedCount: 1 }),
			});
			const db = {
				collection: jest.fn((name) => {
					if (name === 'materials') return materials;
					if (name === 'stocks') return stocks;
					if (name === 'groups') return groups;
					if (name === 'trackedmessages') return tracked;
					return mockCollection();
				}),
				listCollections: jest.fn().mockReturnValue({ hasNext: async () => true }),
			};

			const result = await purgeLogistics(db, { dryRun: false });
			expect(materials.deleteMany).toHaveBeenCalledWith({});
			expect(stocks.deleteMany).toHaveBeenCalledWith({});
			expect(groups.drop).toHaveBeenCalled();
			expect(tracked.deleteMany).toHaveBeenCalled();
			expect(result.trackedDeleted).toBe(1);
			expect(result.groupsDropped).toBe(true);
		});

		it('ne delete pas si collections vides et ignore groups absents', async () => {
			const materials = mockCollection();
			const stocks = mockCollection();
			const groups = mockCollection({
				countDocuments: jest.fn().mockRejectedValue(new Error('missing')),
			});
			const tracked = mockCollection();
			const db = {
				collection: jest.fn((name) => {
					if (name === 'materials') return materials;
					if (name === 'stocks') return stocks;
					if (name === 'groups') return groups;
					if (name === 'trackedmessages') return tracked;
					return mockCollection();
				}),
				listCollections: jest.fn().mockReturnValue({ hasNext: async () => false }),
			};

			const result = await purgeLogistics(db);
			expect(result.materialsDeleted).toBe(0);
			expect(result.stocksDeleted).toBe(0);
			expect(result.groupsDropped).toBe(false);
			expect(materials.deleteMany).not.toHaveBeenCalled();
			expect(tracked.deleteMany).not.toHaveBeenCalled();
		});

		it('fallback deletedCount et NamespaceNotFound sur drop', async () => {
			const materials = mockCollection({
				countDocuments: jest.fn().mockResolvedValue(2),
				deleteMany: jest.fn().mockResolvedValue({ deletedCount: undefined }),
			});
			const stocks = mockCollection({
				countDocuments: jest.fn().mockResolvedValue(4),
				deleteMany: jest.fn().mockResolvedValue({}),
			});
			const groups = mockCollection({
				countDocuments: jest.fn().mockResolvedValue(1),
				drop: jest.fn().mockRejectedValue({ codeName: 'NamespaceNotFound' }),
			});
			const tracked = mockCollection();
			const db = {
				collection: jest.fn((name) => {
					if (name === 'materials') return materials;
					if (name === 'stocks') return stocks;
					if (name === 'groups') return groups;
					if (name === 'trackedmessages') return tracked;
					return mockCollection();
				}),
				listCollections: jest.fn().mockReturnValue({ hasNext: async () => false }),
			};

			const result = await purgeLogistics(db, { dryRun: false });
			expect(result.materialsDeleted).toBe(2);
			expect(result.stocksDeleted).toBe(4);
			expect(result.groupsDropped).toBe(false);
		});

		it('propage les erreurs drop non NamespaceNotFound', async () => {
			const groups = mockCollection({
				countDocuments: jest.fn().mockResolvedValue(1),
				drop: jest.fn().mockRejectedValue(Object.assign(new Error('boom'), { codeName: 'Other' })),
			});
			const db = {
				collection: jest.fn((name) => {
					if (name === 'groups') return groups;
					return mockCollection();
				}),
				listCollections: jest.fn().mockReturnValue({ hasNext: async () => false }),
			};
			await expect(purgeLogistics(db, { dryRun: false })).rejects.toThrow('boom');
		});
	});

	describe('migrateStockpileChannelId', () => {
		it('copie group_id vers channel_id', async () => {
			const docs = [{ _id: 's1', group_id: 'ch-9' }];
			const stockpiles = mockCollection({
				countDocuments: jest.fn()
					.mockResolvedValueOnce(1)
					.mockResolvedValueOnce(0),
				find: jest.fn().mockReturnValue({ toArray: async () => docs }),
				updateOne: jest.fn().mockResolvedValue({}),
			});
			const db = { collection: () => stockpiles };

			const result = await migrateStockpileChannelId(db, { dryRun: false });
			expect(result.copiedGroupIdToChannelId).toBe(1);
			expect(stockpiles.updateOne).toHaveBeenCalledWith(
				{ _id: 's1' },
				{ $set: { channel_id: 'ch-9' }, $unset: { group_id: '' } },
			);
		});

		it('unset group_id quand channel_id déjà présent', async () => {
			const stockpiles = mockCollection({
				countDocuments: jest.fn()
					.mockResolvedValueOnce(0)
					.mockResolvedValueOnce(2),
				updateMany: jest.fn().mockResolvedValue({}),
			});
			const db = { collection: () => stockpiles };

			const result = await migrateStockpileChannelId(db);
			expect(result.unsetGroupIdOnly).toBe(2);
			expect(stockpiles.updateMany).toHaveBeenCalled();
			expect(stockpiles.updateOne).not.toHaveBeenCalled();
		});

		it('dry-run ne mutate pas', async () => {
			const stockpiles = mockCollection({
				countDocuments: jest.fn().mockResolvedValue(2),
			});
			const db = { collection: () => stockpiles };
			await migrateStockpileChannelId(db, { dryRun: true });
			expect(stockpiles.updateOne).not.toHaveBeenCalled();
			expect(stockpiles.updateMany).not.toHaveBeenCalled();
		});
	});

	describe('cleanupStats', () => {
		it('prune les clés slash obsolètes', async () => {
			const docs = [{
				_id: 'g1',
				material_validated_count: 3,
				command_breakdown: { stock: 5, help: 2, order: 1 },
				last_command_by_type: { logistics: new Date(), help: new Date() },
			}];
			const stats = mockCollection({
				find: jest.fn().mockReturnValue({ toArray: async () => docs }),
				updateOne: jest.fn().mockResolvedValue({}),
			});
			const db = { collection: () => stats };

			const result = await cleanupStats(db, { dryRun: false });
			expect(result.docsTouched).toBe(1);
			expect(result.keysPruned).toBeGreaterThanOrEqual(2);
			expect(stats.updateOne).toHaveBeenCalledWith(
				{ _id: 'g1' },
				expect.objectContaining({
					$unset: { material_validated_count: '' },
					$set: expect.objectContaining({
						command_breakdown: expect.not.objectContaining({ stock: expect.anything() }),
					}),
				}),
			);
		});

		it('dry-run compte sans updateOne', async () => {
			const stats = mockCollection({
				find: jest.fn().mockReturnValue({
					toArray: async () => [{ _id: 'g2', material_validated_count: 1 }],
				}),
			});
			const result = await cleanupStats({ collection: () => stats }, { dryRun: true });
			expect(result.docsTouched).toBe(1);
			expect(result.materialValidatedUnset).toBe(1);
			expect(stats.updateOne).not.toHaveBeenCalled();
		});

		it('ignore docs déjà propres et breakdown non objet', async () => {
			const stats = mockCollection({
				find: jest.fn().mockReturnValue({
					toArray: async () => [
						{ _id: 'ok', command_breakdown: { help: 1 }, last_command_by_type: { help: new Date() } },
						{ _id: 'bad', command_breakdown: 'x', last_command_by_type: null },
					],
				}),
			});
			const result = await cleanupStats({ collection: () => stats });
			expect(result.docsTouched).toBe(0);
			expect(stats.updateOne).not.toHaveBeenCalled();
		});
	});
});
