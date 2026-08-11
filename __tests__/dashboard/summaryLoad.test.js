'use strict';

jest.mock('mongoose', () => ({
	connection: {
		name: 'testdb',
		db: {
			collection: jest.fn(),
		},
	},
}));

jest.mock('../../utils/foxholeWarApi', () => ({
	getWarStatusSummary: jest.fn().mockResolvedValue({ available: true, warNumber: 1 }),
}));

jest.mock('../../utils/blockedGuilds', () => ({
	getBlockedGuildDetails: jest.fn().mockResolvedValue(new Map([
		['g-blocked', 'mongo'],
	])),
}));

const mongoose = require('mongoose');
const { getWarStatusSummary } = require('../../utils/foxholeWarApi');
const { getBlockedGuildDetails } = require('../../utils/blockedGuilds');
const {
	topEntries,
	groupCount,
	createLoadSummary,
	MS,
} = require('../../.dashboard/lib/summary');

function makeCursor(docs) {
	return {
		toArray: jest.fn().mockResolvedValue(docs),
	};
}

describe('dashboard summary extras', () => {
	it('topEntries sorts and limits', () => {
		expect(topEntries({ b: 2, a: 5, c: 1 }, 2)).toEqual([
			{ name: 'a', count: 5 },
			{ name: 'b', count: 2 },
		]);
		expect(topEntries(null)).toEqual([]);
	});

	it('groupCount aggregates and sorts', () => {
		expect(groupCount([{ status: 'open' }, { status: 'open' }, { status: 'closed' }], (d) => d.status))
			.toEqual([
				{ name: 'open', total: 2 },
				{ name: 'closed', total: 1 },
			]);
	});
});

describe('createLoadSummary', () => {
	const now = Date.now();
	const recent = new Date(now - 60_000).toISOString();

	beforeEach(() => {
		jest.clearAllMocks();
		const collections = {
			stats: {
				find: jest.fn(() => makeCursor([
					{
						guild_id: 'g1',
						name: 'Alpha',
						member_count: 12,
						command_count: 10,
						last_command_at: recent,
						first_command_at: recent,
						joined_at: '2026-01-15T00:00:00.000Z',
						operation_count: 2,
						stock_board_count: 1,
						material_count: 5,
						material_validated_count: 3,
						command_breakdown: { help: 7, setup: 3 },
					},
					{
						guild_id: 'g-blocked',
						name: 'Blocked',
						member_count: 3,
						command_count: 0,
						joined_at: '2026-02-01T00:00:00.000Z',
					},
					{
						guild_id: 'g-left',
						name: 'Gone',
						left_at: '2026-03-01T00:00:00.000Z',
						command_count: 4,
						joined_at: '2025-12-01T00:00:00.000Z',
					},
				])),
				aggregate: jest.fn(() => makeCursor([
					{ _id: 'help', total: 7 },
					{ _id: 'setup', total: 3 },
				])),
			},
			servers: {
				find: jest.fn(() => makeCursor([
					{ guild_id: 'g1', lang: 'fr', camp: 'warden', logs: true },
				])),
			},
			orderboards: {
				find: jest.fn(() => makeCursor([
					{ status: 'open', kind: 'regiment' },
					{ status: 'closed', kind: 'coalition' },
				])),
			},
			orderlines: {
				find: jest.fn(() => makeCursor([
					{ target: 10, current: 10, priority: 'high' },
					{ target: 5, current: 1, priority: 'neutral' },
				])),
			},
			stockpiles: {
				estimatedDocumentCount: jest.fn().mockResolvedValue(4),
			},
			operations: {
				find: jest.fn(() => makeCursor([{ status: 'active' }])),
			},
			notificationsubscriptions: {
				find: jest.fn(() => makeCursor([{ notification_type: 'ops' }])),
			},
			trackedmessages: {
				estimatedDocumentCount: jest.fn().mockResolvedValue(9),
			},
		};

		mongoose.connection.db.collection.mockImplementation((name) => collections[name]);
	});

	it('aggregates guilds, kpis, product and blocked flags', async () => {
		const loadSummary = createLoadSummary('/repo/.env.prod');
		const data = await loadSummary();

		expect(data.env_file).toBe('.env.prod');
		expect(data.db_name).toBe('testdb');
		expect(data.war).toEqual({ available: true, warNumber: 1 });
		expect(data.kpis.active_guilds).toBe(2);
		expect(data.kpis.left_guilds).toBe(1);
		expect(data.kpis.orderboards).toBe(2);
		expect(data.kpis.stockpiles).toBe(4);
		expect(data.kpis.tracked_messages).toBe(9);
		expect(data.commands[0]).toMatchObject({ name: 'help', total: 7 });

		const alpha = data.guilds.find((g) => g.guild_id === 'g1');
		expect(alpha.setup).toBe(true);
		expect(alpha.lang).toBe('fr');
		expect(alpha.top_commands[0]).toEqual({ name: 'help', count: 7 });

		const blocked = data.guilds.find((g) => g.guild_id === 'g-blocked');
		expect(blocked.blocked).toBe(true);
		expect(blocked.blocked_source).toBe('mongo');
		expect(data.blocked_guilds).toEqual([expect.objectContaining({
			guild_id: 'g-blocked',
			source: 'mongo',
			name: 'Blocked',
			can_unblacklist: true,
		})]);

		expect(data.left_guilds[0].guild_id).toBe('g-left');
		expect(data.product.orderline_progress.complete).toBe(1);
		expect(data.product.orderline_progress.pct).toBeCloseTo(73.3, 1);
		expect(getBlockedGuildDetails).toHaveBeenCalled();
	});

	it('tolerates war summary failure', async () => {
		getWarStatusSummary.mockRejectedValueOnce(new Error('war down'));
		const loadSummary = createLoadSummary('/repo/.env');
		const data = await loadSummary();
		expect(data.war).toEqual({ available: false });
	});

	it('covers edge buckets, blocked both, left sort and empty active', async () => {
		const edgeNow = Date.now();
		getBlockedGuildDetails.mockResolvedValueOnce(new Map([
			['g-blocked', 'both'],
			['g-orphan', 'file'],
		]));
		mongoose.connection.db.collection.mockImplementation((name) => {
			const collections = {
				stats: {
					find: jest.fn(() => makeCursor([
						{
							guild_id: 'g1',
							name: 'Zulu',
							member_count: 0,
							command_count: 0,
							last_command_at: null,
							joined_at: 'invalid-date',
							command_breakdown: 'not-an-object',
						},
						{
							guild_id: 'g2',
							name: 'Alpha',
							member_count: 25,
							command_count: 5,
							last_command_at: new Date(edgeNow - MS.d30 + (86400 * 1000)).toISOString(),
							joined_at: '2026-01-01T00:00:00.000Z',
							left_at: null,
						},
						{
							guild_id: 'g-left-a',
							name: 'Left A',
							left_at: '2026-01-01T00:00:00.000Z',
							command_count: 1,
						},
						{
							guild_id: 'g-left-b',
							name: 'Left B',
							left_at: '2026-03-01T00:00:00.000Z',
							command_count: 1,
						},
					])),
					aggregate: jest.fn(() => makeCursor([])),
				},
				servers: {
					find: jest.fn(() => makeCursor([
						{ guild_id: 'g2', lang: 'en', camp: 'colonial', logs: false },
					])),
				},
				orderboards: { find: jest.fn(() => makeCursor([{ status: 'closed', kind: 'x' }])) },
				orderlines: { find: jest.fn(() => makeCursor([{ target: 0, current: 0, priority: 'low' }])) },
				stockpiles: { estimatedDocumentCount: jest.fn().mockResolvedValue(0) },
				operations: { find: jest.fn(() => makeCursor([])) },
				notificationsubscriptions: { find: jest.fn(() => makeCursor([])) },
				trackedmessages: { estimatedDocumentCount: jest.fn().mockResolvedValue(0) },
			};
			return collections[name];
		});

		const loadSummary = createLoadSummary('/repo/.env.prod');
		const data = await loadSummary();
		expect(data.kpis.setup_rate_pct).toBe(50);
		expect(data.kpis.engagement_7d_pct).toBe(0);
		expect(data.kpis.avg_members).toBe(13);
		expect(data.guilds.find((g) => g.guild_id === 'g1').cmds_per_member).toBe(0);
		expect(data.guilds.find((g) => g.guild_id === 'g1').command_breakdown).toEqual({});
		expect(data.left_guilds[0].guild_id).toBe('g-left-b');
		expect(data.blocked_guilds.map((b) => b.guild_id).sort()).toEqual(['g-blocked', 'g-orphan']);
		expect(data.blocked_guilds.find((b) => b.guild_id === 'g-blocked').can_unblacklist).toBe(true);
		expect(data.blocked_guilds.find((b) => b.guild_id === 'g-orphan').can_unblacklist).toBe(false);
		expect(data.product.orderline_progress.pct).toBe(0);
		expect(data.members.distribution.some((d) => d.name === '10–49')).toBe(true);
		expect(data.activity.buckets.find((b) => b.name === '30d').total).toBe(1);
	});

	it('covers war error non-Error, name fallback, line priority and product groupings', async () => {
		getWarStatusSummary.mockRejectedValueOnce('war string fail');
		const warNow = Date.now();
		mongoose.connection.db.collection.mockImplementation((name) => {
			const collections = {
				stats: {
					find: jest.fn(() => makeCursor([
						{
							guild_id: 'g-noname',
							member_count: 8,
							command_count: 3,
							last_command_at: new Date(warNow - 1000).toISOString(),
							joined_at: '2026-01-01T00:00:00.000Z',
						},
						{
							guild_id: 'g-old',
							name: 'Old',
							member_count: 5,
							command_count: 1,
							last_command_at: null,
							joined_at: '2026-01-01T00:00:00.000Z',
						},
					])),
					aggregate: jest.fn(() => makeCursor([{ _id: 'help', total: 1 }])),
				},
				servers: { find: jest.fn(() => makeCursor([])) },
				orderboards: {
					find: jest.fn(() => makeCursor([
						{ status: null, kind: null },
					])),
				},
				orderlines: {
					find: jest.fn(() => makeCursor([
						{ target: 2, current: 2 },
						{ target: 1, current: 0, priority: 'high' },
					])),
				},
				stockpiles: { estimatedDocumentCount: jest.fn().mockResolvedValue(1) },
				operations: { find: jest.fn(() => makeCursor([{ status: null }])) },
				notificationsubscriptions: {
					find: jest.fn(() => makeCursor([{ notification_type: null }])),
				},
				trackedmessages: { estimatedDocumentCount: jest.fn().mockResolvedValue(0) },
			};
			return collections[name];
		});

		const data = await createLoadSummary('/repo/.env')();
		expect(data.war).toEqual({ available: false });
		expect(data.guilds.find((g) => g.guild_id === 'g-noname').name).toBe('g-noname');
		expect(data.product.orderline_progress.complete).toBe(1);
		expect(data.product.orderlines_by_priority.some((p) => p.name === 'neutral')).toBe(true);
		expect(data.product.orderboards_by_status[0].name).toBe('unknown');
		expect(data.product.operations_by_status[0].name).toBe('unknown');
		expect(data.product.notifications_by_type[0].name).toBe('unknown');
		expect(data.kpis.engaged_7d).toBe(1);
		expect(data.guilds[0].guild_id).toBe('g-noname');
		expect(data.guilds[1].guild_id).toBe('g-old');
	});

	it('guilds actifs triés par last_command_at avec null en dernier', async () => {
		const sortNow = Date.now();
		mongoose.connection.db.collection.mockImplementation((name) => {
			const collections = {
				stats: {
					find: jest.fn(() => makeCursor([
						{
							guild_id: 'g-null',
							name: 'NoActivity',
							member_count: 1,
							command_count: 1,
							last_command_at: null,
							joined_at: '2026-01-01T00:00:00.000Z',
						},
						{
							guild_id: 'g-recent',
							name: 'Recent',
							member_count: 1,
							command_count: 5,
							last_command_at: new Date(sortNow - 1000).toISOString(),
							joined_at: '2026-01-01T00:00:00.000Z',
						},
					])),
					aggregate: jest.fn(() => makeCursor([])),
				},
				servers: { find: jest.fn(() => makeCursor([])) },
				orderboards: { find: jest.fn(() => makeCursor([])) },
				orderlines: { find: jest.fn(() => makeCursor([])) },
				stockpiles: { estimatedDocumentCount: jest.fn().mockResolvedValue(0) },
				operations: { find: jest.fn(() => makeCursor([])) },
				notificationsubscriptions: { find: jest.fn(() => makeCursor([])) },
				trackedmessages: { estimatedDocumentCount: jest.fn().mockResolvedValue(0) },
			};
			return collections[name];
		});

		const data = await createLoadSummary('/repo/.env')();
		expect(data.guilds[0].guild_id).toBe('g-recent');
		expect(data.guilds[1].guild_id).toBe('g-null');
	});

	it('orderline_progress accepte champs null sur les lignes', async () => {
		mongoose.connection.db.collection.mockImplementation((name) => {
			const collections = {
				stats: {
					find: jest.fn(() => makeCursor([
						{ guild_id: 'g1', name: 'A', member_count: 1, command_count: 1, joined_at: '2026-01-01T00:00:00.000Z' },
					])),
					aggregate: jest.fn(() => makeCursor([])),
				},
				servers: { find: jest.fn(() => makeCursor([])) },
				orderboards: { find: jest.fn(() => makeCursor([])) },
				orderlines: {
					find: jest.fn(() => makeCursor([
						{ target: null, current: null, priority: null },
					])),
				},
				stockpiles: { estimatedDocumentCount: jest.fn().mockResolvedValue(0) },
				operations: { find: jest.fn(() => makeCursor([])) },
				notificationsubscriptions: { find: jest.fn(() => makeCursor([])) },
				trackedmessages: { estimatedDocumentCount: jest.fn().mockResolvedValue(0) },
			};
			return collections[name];
		});

		const data = await createLoadSummary('/repo/.env')();
		expect(data.product.orderline_progress).toMatchObject({
			target: 0,
			current: 0,
			complete: 0,
		});
		expect(data.product.orderlines_by_priority).toEqual([{ name: 'neutral', total: 1 }]);
	});

	it('orderline_progress traite priorité vide comme neutral', async () => {
		mongoose.connection.db.collection.mockImplementation((name) => {
			const collections = {
				stats: {
					find: jest.fn(() => makeCursor([
						{ guild_id: 'g1', name: 'A', member_count: 1, command_count: 1, joined_at: '2026-01-01T00:00:00.000Z' },
					])),
					aggregate: jest.fn(() => makeCursor([])),
				},
				servers: { find: jest.fn(() => makeCursor([])) },
				orderboards: { find: jest.fn(() => makeCursor([])) },
				orderlines: {
					find: jest.fn(() => makeCursor([
						{ target: 2, current: 1, priority: null },
					])),
				},
				stockpiles: { estimatedDocumentCount: jest.fn().mockResolvedValue(0) },
				operations: { find: jest.fn(() => makeCursor([])) },
				notificationsubscriptions: { find: jest.fn(() => makeCursor([])) },
				trackedmessages: { estimatedDocumentCount: jest.fn().mockResolvedValue(0) },
			};
			return collections[name];
		});

		const data = await createLoadSummary('/repo/.env')();
		expect(data.product.orderlines_by_priority.some((p) => p.name === 'neutral')).toBe(true);
		expect(data.product.orderline_progress.complete).toBe(0);
	});

	it('orderline_progress compte deux lignes même priorité', async () => {
		mongoose.connection.db.collection.mockImplementation((name) => {
			const collections = {
				stats: {
					find: jest.fn(() => makeCursor([
						{ guild_id: 'g1', name: 'A', member_count: 1, command_count: 1, joined_at: '2026-01-01T00:00:00.000Z' },
					])),
					aggregate: jest.fn(() => makeCursor([])),
				},
				servers: { find: jest.fn(() => makeCursor([])) },
				orderboards: { find: jest.fn(() => makeCursor([])) },
				orderlines: {
					find: jest.fn(() => makeCursor([
						{ target: 2, current: 2, priority: 'high' },
						{ target: 1, current: 0, priority: 'high' },
					])),
				},
				stockpiles: { estimatedDocumentCount: jest.fn().mockResolvedValue(0) },
				operations: { find: jest.fn(() => makeCursor([])) },
				notificationsubscriptions: { find: jest.fn(() => makeCursor([])) },
				trackedmessages: { estimatedDocumentCount: jest.fn().mockResolvedValue(0) },
			};
			return collections[name];
		});

		const data = await createLoadSummary('/repo/.env')();
		const high = data.product.orderlines_by_priority.find((p) => p.name === 'high');
		expect(high.total).toBe(2);
		expect(data.product.orderline_progress.complete).toBe(1);
	});

	it('orderline_progress ignore lignes incomplètes et sans target', async () => {
		mongoose.connection.db.collection.mockImplementation((name) => {
			const collections = {
				stats: {
					find: jest.fn(() => makeCursor([
						{ guild_id: 'g1', name: 'A', member_count: 1, command_count: 1, joined_at: '2026-01-01T00:00:00.000Z' },
					])),
					aggregate: jest.fn(() => makeCursor([])),
				},
				servers: { find: jest.fn(() => makeCursor([])) },
				orderboards: { find: jest.fn(() => makeCursor([])) },
				orderlines: {
					find: jest.fn(() => makeCursor([
						{ target: 0, current: 5 },
						{ target: 3, current: 1, priority: null },
					])),
				},
				stockpiles: { estimatedDocumentCount: jest.fn().mockResolvedValue(0) },
				operations: { find: jest.fn(() => makeCursor([])) },
				notificationsubscriptions: { find: jest.fn(() => makeCursor([])) },
				trackedmessages: { estimatedDocumentCount: jest.fn().mockResolvedValue(0) },
			};
			return collections[name];
		});

		const data = await createLoadSummary('/repo/.env')();
		expect(data.product.orderline_progress.complete).toBe(0);
		expect(data.product.orderlines_by_priority.some((p) => p.name === 'neutral')).toBe(true);
	});

	it('db_name null si connection.name et MONGODB_NAME absents', async () => {
		const savedName = mongoose.connection.name;
		const prevMongo = process.env.MONGODB_NAME;
		mongoose.connection.name = '';
		delete process.env.MONGODB_NAME;
		mongoose.connection.db.collection.mockImplementation((name) => {
			const collections = {
				stats: {
					find: jest.fn(() => makeCursor([
						{ guild_id: 'g1', name: 'A', member_count: 1, command_count: 1, joined_at: '2026-01-01T00:00:00.000Z' },
					])),
					aggregate: jest.fn(() => makeCursor([])),
				},
				servers: { find: jest.fn(() => makeCursor([])) },
				orderboards: { find: jest.fn(() => makeCursor([])) },
				orderlines: { find: jest.fn(() => makeCursor([])) },
				stockpiles: { estimatedDocumentCount: jest.fn().mockResolvedValue(0) },
				operations: { find: jest.fn(() => makeCursor([])) },
				notificationsubscriptions: { find: jest.fn(() => makeCursor([])) },
				trackedmessages: { estimatedDocumentCount: jest.fn().mockResolvedValue(0) },
			};
			return collections[name];
		});

		const data = await createLoadSummary('/repo/.env')();
		expect(data.db_name).toBeNull();
		mongoose.connection.name = savedName;
		if (prevMongo !== undefined) process.env.MONGODB_NAME = prevMongo;
	});

	it('utilise MONGODB_NAME si connection.name absent et servers lang/camp unknown', async () => {
		const savedName = mongoose.connection.name;
		mongoose.connection.name = '';
		process.env.MONGODB_NAME = 'fallback-db';
		mongoose.connection.db.collection.mockImplementation((name) => {
			const collections = {
				stats: {
					find: jest.fn(() => makeCursor([
						{ guild_id: 'g1', name: 'A', member_count: 1, command_count: 1, joined_at: '2026-01-01T00:00:00.000Z' },
					])),
					aggregate: jest.fn(() => makeCursor([])),
				},
				servers: {
					find: jest.fn(() => makeCursor([
						{ guild_id: 'g1', logs: true },
					])),
				},
				orderboards: { find: jest.fn(() => makeCursor([])) },
				orderlines: { find: jest.fn(() => makeCursor([])) },
				stockpiles: { estimatedDocumentCount: jest.fn().mockResolvedValue(0) },
				operations: { find: jest.fn(() => makeCursor([])) },
				notificationsubscriptions: { find: jest.fn(() => makeCursor([])) },
				trackedmessages: { estimatedDocumentCount: jest.fn().mockResolvedValue(0) },
			};
			return collections[name];
		});

		const data = await createLoadSummary('/repo/.env')();
		expect(data.db_name).toBe('fallback-db');
		expect(data.product.servers_by_lang[0].name).toBe('unknown');
		expect(data.product.servers_by_camp[0].name).toBe('unknown');
		mongoose.connection.name = savedName;
		delete process.env.MONGODB_NAME;
	});

	it('returns zeros when no active guilds remain', async () => {
		mongoose.connection.db.collection.mockImplementation((name) => {
			const collections = {
				stats: {
					find: jest.fn(() => makeCursor([
						{ guild_id: 'gone', name: 'Gone', left_at: '2026-01-01T00:00:00.000Z', command_count: 1 },
					])),
					aggregate: jest.fn(() => makeCursor([])),
				},
				servers: { find: jest.fn(() => makeCursor([])) },
				orderboards: { find: jest.fn(() => makeCursor([])) },
				orderlines: { find: jest.fn(() => makeCursor([])) },
				stockpiles: { estimatedDocumentCount: jest.fn().mockResolvedValue(0) },
				operations: { find: jest.fn(() => makeCursor([])) },
				notificationsubscriptions: { find: jest.fn(() => makeCursor([])) },
				trackedmessages: { estimatedDocumentCount: jest.fn().mockResolvedValue(0) },
			};
			return collections[name];
		});
		const data = await createLoadSummary('/repo/.env')();
		expect(data.kpis.active_guilds).toBe(0);
		expect(data.kpis.setup_rate_pct).toBe(0);
		expect(data.kpis.avg_commands_per_active).toBe(0);
		expect(data.kpis.engagement_7d_pct).toBe(0);
		expect(data.kpis.avg_members).toBe(0);
	});
});
