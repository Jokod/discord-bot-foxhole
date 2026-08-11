'use strict';

jest.mock('mongoose', () => ({
	connection: {
		db: {
			collection: jest.fn(),
		},
	},
}));

const mongoose = require('mongoose');
const {
	getEnvBlockedGuildIds,
	getBlockedGuildIds,
	getBlockedGuildDetails,
	getBlockedSource,
	getMongoBlockedGuildIds,
	addBlockedGuilds,
	removeBlockedGuilds,
} = require('../../utils/blockedGuilds');

describe('blockedGuilds', () => {
	let store;
	let col;
	const prevEnv = process.env.BLOCKED_GUILD_IDS;

	beforeEach(() => {
		store = new Map();
		col = {
			find: jest.fn(() => ({
				project: () => ({
					toArray: async () => [...store.values()].map((d) => ({ _id: d._id })),
				}),
			})),
			findOne: jest.fn(async (q) => store.get(q._id) || null),
			updateOne: jest.fn(async (q, update, opts) => {
				const id = q._id;
				if (store.has(id)) {
					return { upsertedCount: 0, matchedCount: 1 };
				}
				if (opts?.upsert) {
					store.set(id, { _id: id, ...(update.$setOnInsert || {}) });
					return { upsertedCount: 1, matchedCount: 0 };
				}
				return { upsertedCount: 0, matchedCount: 0 };
			}),
			deleteOne: jest.fn(async (q) => {
				const had = store.delete(q._id);
				return { deletedCount: had ? 1 : 0 };
			}),
		};
		mongoose.connection.db.collection.mockReturnValue(col);
		delete process.env.BLOCKED_GUILD_IDS;
	});

	afterEach(() => {
		if (prevEnv === undefined) delete process.env.BLOCKED_GUILD_IDS;
		else process.env.BLOCKED_GUILD_IDS = prevEnv;
	});

	it('reads env blocked ids', () => {
		process.env.BLOCKED_GUILD_IDS = ' a ,b, ';
		expect([...getEnvBlockedGuildIds()].sort()).toEqual(['a', 'b']);
	});

	it('unions env and mongo ids', async () => {
		process.env.BLOCKED_GUILD_IDS = 'env-1';
		store.set('mongo-1', { _id: 'mongo-1' });
		const ids = await getBlockedGuildIds();
		expect(ids.has('env-1')).toBe(true);
		expect(ids.has('mongo-1')).toBe(true);
	});

	it('reports source details', async () => {
		process.env.BLOCKED_GUILD_IDS = 'both-1,env-only';
		store.set('both-1', { _id: 'both-1' });
		store.set('mongo-only', { _id: 'mongo-only' });
		const details = await getBlockedGuildDetails();
		expect(details.get('both-1')).toBe('both');
		expect(details.get('env-only')).toBe('env');
		expect(details.get('mongo-only')).toBe('mongo');
	});

	it('adds blocked guilds in mongo', async () => {
		const result = await addBlockedGuilds(['g1', 'g1', ''], { by: 'admin' });
		expect(result.added).toEqual(['g1']);
		expect(store.has('g1')).toBe(true);
		const again = await addBlockedGuilds(['g1']);
		expect(again.already).toEqual(['g1']);
	});

	it('getBlockedSource retourne la source ou null', async () => {
		process.env.BLOCKED_GUILD_IDS = 'both-1,env-only';
		store.set('both-1', { _id: 'both-1' });
		expect(await getBlockedSource('both-1')).toBe('both');
		expect(await getBlockedSource('env-only')).toBe('env');
		expect(await getBlockedSource('unknown')).toBeNull();
	});

	it('getMongoBlockedGuildIds retourne un Set vide sans DB', async () => {
		mongoose.connection.db = null;
		expect(await getMongoBlockedGuildIds()).toEqual(new Set());
		mongoose.connection.db = { collection: jest.fn().mockReturnValue(col) };
	});

	it('addBlockedGuilds throw sans MongoDB', async () => {
		mongoose.connection.db = null;
		await expect(addBlockedGuilds(['g1'])).rejects.toMatchObject({
			status: 500,
			code: 'GUILD_DB',
		});
		mongoose.connection.db = { collection: jest.fn().mockReturnValue(col) };
	});

	it('removeBlockedGuilds throw sans MongoDB', async () => {
		mongoose.connection.db = null;
		await expect(removeBlockedGuilds(['g1'])).rejects.toMatchObject({
			status: 500,
			code: 'GUILD_DB',
		});
		mongoose.connection.db = { collection: jest.fn().mockReturnValue(col) };
	});

	it('removeBlockedGuilds ignore les ids vides', async () => {
		store.set('mongo-1', { _id: 'mongo-1' });
		const result = await removeBlockedGuilds(['mongo-1', '', '  ']);
		expect(result.removed).toEqual(['mongo-1']);
	});

	it('removes mongo entries but skips env-only', async () => {
		process.env.BLOCKED_GUILD_IDS = 'env-locked';
		store.set('mongo-1', { _id: 'mongo-1' });
		store.set('env-locked', { _id: 'env-locked' });

		const result = await removeBlockedGuilds(['mongo-1', 'env-locked', 'missing']);
		expect(result.removed).toEqual(['mongo-1', 'env-locked']);
		expect(result.skipped_env).toContain('env-locked');
		expect(result.missing).toEqual(['missing']);
		expect(store.has('mongo-1')).toBe(false);

		const envOnly = await removeBlockedGuilds(['env-locked']);
		expect(envOnly.removed).toEqual([]);
		expect(envOnly.skipped_env).toEqual(['env-locked']);
	});
});
