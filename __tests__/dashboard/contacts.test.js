'use strict';

jest.mock('mongoose', () => ({
	connection: {
		db: {
			collection: jest.fn(),
		},
	},
}));

jest.mock('../../utils/discordRest', () => ({
	mapUser: jest.fn((data) => ({
		user_id: data.id,
		username: data.username,
		display_name: data.global_name || data.username,
		avatar_url: null,
		profile_url: `https://discord.com/users/${data.id}`,
	})),
	discordFetch: jest.fn(),
}));

const mongoose = require('mongoose');
const { discordFetch, mapUser } = require('../../utils/discordRest');
const {
	bumpCreator,
	loadContacts,
	resetContactsCacheForTests,
} = require('../../.dashboard/lib/contacts');

describe('dashboard contacts', () => {
	const prevToken = process.env.TOKEN;

	afterAll(() => {
		if (prevToken === undefined) delete process.env.TOKEN;
		else process.env.TOKEN = prevToken;
	});

	beforeEach(() => {
		resetContactsCacheForTests();
		jest.clearAllMocks();
		delete process.env.TOKEN;
	});

	it('bumpCreator ignores empty ids and increments kinds', () => {
		const map = new Map();
		bumpCreator(map, 'g1', '0', 'stockpiles');
		bumpCreator(map, 'g1', null, 'operations');
		expect(map.size).toBe(0);

		bumpCreator(map, 'g1', 'u1', 'stockpiles');
		bumpCreator(map, 'g1', 'u1', 'operations');
		bumpCreator(map, 'g1', 'u1', 'boards');
		expect(map.get('g1').get('u1')).toMatchObject({
			stockpiles: 1,
			operations: 1,
			boards: 1,
			lines: 0,
		});
	});

	it('loadContacts aggregates creators without discord token', async () => {
		const updateOne = jest.fn().mockResolvedValue({});
		const collections = {
			stats: {
				find: jest.fn(() => ({
					project: () => ({
						toArray: async () => ([
							{
								guild_id: 'g1',
								name: 'Alpha',
								member_count: 10,
								command_count: 5,
								owner_id: 'owner1',
							},
							{
								guild_id: 'g2',
								name: 'Left',
								left_at: '2026-01-01T00:00:00.000Z',
								command_count: 1,
							},
						]),
					}),
				})),
				updateOne,
			},
			stockpiles: {
				find: jest.fn(() => ({
					project: () => ({
						toArray: async () => ([{ server_id: 'g1', owner_id: 'creator1' }]),
					}),
				})),
			},
			operations: {
				find: jest.fn(() => ({
					project: () => ({ toArray: async () => ([]) }),
				})),
			},
			orderboards: {
				find: jest.fn(() => ({
					project: () => ({ toArray: async () => ([]) }),
				})),
			},
			orderlines: {
				find: jest.fn(() => ({
					project: () => ({ toArray: async () => ([]) }),
				})),
			},
		};
		mongoose.connection.db.collection.mockImplementation((name) => collections[name]);

		const data = await loadContacts();
		expect(data.discord_token).toBe(false);
		expect(data.kpis.active_guilds).toBe(1);
		expect(data.kpis.left_guilds).toBe(1);
		expect(data.guilds[0].guild_id).toBe('g1');
		expect(data.guilds[0].owner.user_id).toBe('owner1');
		expect(data.guilds[0].creators[0]).toMatchObject({
			user_id: 'creator1',
			stockpiles: 1,
		});
		expect(data.people.some((p) => p.user_id === 'owner1')).toBe(true);
		expect(discordFetch).not.toHaveBeenCalled();

		const cached = await loadContacts();
		expect(cached).toBe(data);

		const forced = await loadContacts({ force: true });
		expect(forced).not.toBe(data);
		expect(forced.kpis.guilds).toBe(2);
	});

	it('loadContacts resolves owners via discord and backfills', async () => {
		process.env.TOKEN = 'bot-token';
		discordFetch.mockImplementation(async (url) => {
			if (url.startsWith('/guilds/')) {
				return { ok: true, data: { owner_id: 'fresh-owner' } };
			}
			if (url === '/users/fresh-owner') {
				return { ok: true, data: { id: 'fresh-owner', username: 'boss', global_name: 'Boss' } };
			}
			return { ok: false, status: 404 };
		});

		const updateOne = jest.fn().mockResolvedValue({});
		mongoose.connection.db.collection.mockImplementation((name) => {
			if (name === 'stats') {
				return {
					find: () => ({
						project: () => ({
							toArray: async () => ([{
								guild_id: 'g1',
								name: 'Alpha',
								command_count: 2,
								owner_id: null,
							}]),
						}),
					}),
					updateOne,
				};
			}
			return {
				find: () => ({
					project: () => ({ toArray: async () => ([]) }),
				}),
			};
		});

		const data = await loadContacts({ force: true });
		expect(data.discord_token).toBe(true);
		expect(data.guilds[0].owner).toMatchObject({
			user_id: 'fresh-owner',
			username: 'boss',
		});
		expect(mapUser).toHaveBeenCalled();
		expect(updateOne).toHaveBeenCalledWith(
			{ guild_id: 'g1' },
			{ $set: { owner_id: 'fresh-owner' } },
		);
	});
});
