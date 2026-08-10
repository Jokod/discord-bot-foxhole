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
});
