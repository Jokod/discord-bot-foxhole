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

	it('loadContacts warns on user HTTP errors, guild errors, and sorts creators/guilds', async () => {
		process.env.TOKEN = 'bot-token';
		discordFetch.mockImplementation(async (url) => {
			if (url.startsWith('/guilds/g-err')) {
				return { ok: false, status: 503 };
			}
			if (url.startsWith('/guilds/g-same')) {
				return { ok: true, data: { owner_id: 'owner-same' } };
			}
			if (url.startsWith('/guilds/g-active')) {
				return { ok: true, data: { owner_id: 'owner-active' } };
			}
			if (url === '/users/user-500') {
				return { ok: false, status: 500 };
			}
			if (url === '/users/creator-a' || url === '/users/creator-b' || url === '/users/creator-c') {
				return { ok: true, data: { id: url.slice(7), username: url.slice(7) } };
			}
			if (url === '/users/owner-active' || url === '/users/owner-same') {
				return { ok: true, data: { id: url.slice(7), username: url.slice(7) } };
			}
			return { ok: false, status: 404 };
		});

		mongoose.connection.db.collection.mockImplementation((name) => {
			if (name === 'stats') {
				return {
					find: () => ({
						project: () => ({
							toArray: async () => ([
								{
									guild_id: 'g-active',
									name: 'Active Low',
									command_count: 1,
									owner_id: 'owner-active',
								},
								{
									guild_id: 'g-same',
									name: 'Same Owner',
									command_count: 3,
									owner_id: 'owner-same',
								},
								{
									guild_id: 'g-err',
									name: 'Guild Err',
									command_count: 9,
								},
								{
									guild_id: 'g-left',
									name: 'Left High',
									left_at: '2026-01-01T00:00:00.000Z',
									command_count: 99,
								},
								{
									guild_id: 'g-left-low',
									name: 'Left Low',
									left_at: '2026-02-01T00:00:00.000Z',
									command_count: 1,
								},
							]),
						}),
					}),
					updateOne: jest.fn().mockResolvedValue({}),
				};
			}
			const data = {
				stockpiles: [{ server_id: 'g-active', owner_id: 'creator-b' }],
				operations: [{ guild_id: 'g-active', owner_id: 'creator-a' }],
				orderboards: [{ guild_id: 'g-active', owner_id: 'creator-a' }],
				orderlines: [{ guild_id: 'g-active', owner_id: 'user-500' }],
			};
			return {
				find: () => ({
					project: () => ({ toArray: async () => data[name] || [] }),
				}),
			};
		});

		const data = await loadContacts({ force: true });
		expect(data.warnings.some((w) => w.includes('HTTP 500'))).toBe(true);
		expect(data.guilds.find((g) => g.guild_id === 'g-err').discord.error).toBe('guild HTTP 503');

		const active = data.guilds.filter((g) => g.active);
		expect(active[0].guild_id).toBe('g-err');
		expect(active[1].guild_id).toBe('g-same');
		expect(active[2].guild_id).toBe('g-active');

		const left = data.guilds.filter((g) => !g.active);
		expect(left[0].guild_id).toBe('g-left');
		expect(left[1].guild_id).toBe('g-left-low');

		const creators = data.guilds.find((g) => g.guild_id === 'g-active').creators;
		expect(creators[0].user_id).toBe('creator-a');
		expect(creators.map((c) => c.user_id)).toEqual(['creator-a', 'creator-b', 'user-500']);
	});

	it('bumpCreator increments lines kind', () => {
		const map = new Map();
		bumpCreator(map, 'g1', 'u1', 'lines');
		expect(map.get('g1').get('u1').lines).toBe(1);
	});

	it('loadContacts backfills when discord owner differs and uses user cache', async () => {
		process.env.TOKEN = 'bot-token';
		let userCalls = 0;
		discordFetch.mockImplementation(async (url) => {
			if (url.startsWith('/guilds/g1')) {
				return { ok: true, data: { owner_id: 'new-owner' } };
			}
			if (url === '/users/new-owner') {
				userCalls += 1;
				return { ok: true, data: { id: 'new-owner', username: 'neo' } };
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
								command_count: 1,
								owner_id: 'old-owner',
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
		expect(data.guilds[0].owner_id).toBe('new-owner');
		expect(updateOne).toHaveBeenCalledWith(
			{ guild_id: 'g1' },
			{ $set: { owner_id: 'new-owner' } },
		);
		await loadContacts();
		expect(userCalls).toBe(1);
	});

	it('loadContacts keeps owner when discord owner matches stored owner', async () => {
		process.env.TOKEN = 'bot-token';
		discordFetch.mockImplementation(async (url) => {
			if (url.startsWith('/guilds/g1')) {
				return { ok: true, data: { owner_id: 'same-owner' } };
			}
			if (url === '/users/same-owner') {
				return { ok: true, data: { id: 'same-owner', username: 'same' } };
			}
			return { ok: false, status: 404 };
		});
		const updateOne = jest.fn();
		mongoose.connection.db.collection.mockImplementation((name) => ({
			find: () => ({
				project: () => ({
					toArray: async () => ([{
						guild_id: 'g1',
						name: 'Alpha',
						command_count: 1,
						owner_id: 'same-owner',
					}]),
				}),
			}),
			updateOne,
		}));

		const data = await loadContacts({ force: true });
		expect(data.guilds[0].owner.user_id).toBe('same-owner');
		expect(data.guilds[0].owner_id).toBe('same-owner');
		expect(updateOne).not.toHaveBeenCalled();
	});

	it('loadContacts ne backfill pas si owner Discord identique à stats', async () => {
		process.env.TOKEN = 'bot-token';
		const updateOne = jest.fn().mockResolvedValue({});
		discordFetch.mockImplementation(async (url) => {
			if (url.startsWith('/guilds/g-same')) {
				return { ok: true, data: { owner_id: 'owner-same' } };
			}
			if (url === '/users/owner-same') {
				return { ok: true, data: { id: 'owner-same', username: 'same' } };
			}
			return { ok: false, status: 404 };
		});
		mongoose.connection.db.collection.mockImplementation((name) => ({
			find: () => ({
				project: () => ({
					toArray: async () => ([{
						guild_id: 'g-same',
						name: 'Same',
						command_count: 2,
						owner_id: 'owner-same',
					}]),
				}),
			}),
			updateOne,
		}));

		const data = await loadContacts({ force: true });
		expect(data.guilds[0].owner_id).toBe('owner-same');
		expect(updateOne).not.toHaveBeenCalled();
	});

	it('loadContacts garde owner null si guild Discord sans owner_id', async () => {
		process.env.TOKEN = 'bot-token';
		discordFetch.mockImplementation(async (url) => {
			if (url.startsWith('/guilds/g-no-owner')) {
				return { ok: true, data: {} };
			}
			return { ok: false, status: 404 };
		});
		mongoose.connection.db.collection.mockImplementation((name) => ({
			find: () => ({
				project: () => ({
					toArray: async () => ([{
						guild_id: 'g-no-owner',
						name: 'No Owner',
						command_count: 1,
					}]),
				}),
			}),
			updateOne: jest.fn(),
		}));

		const data = await loadContacts({ force: true });
		expect(data.guilds[0].owner_id).toBeNull();
		expect(data.guilds[0].owner).toBeNull();
	});

	it('loadContacts trie actifs sans command_count comme zero', async () => {
		process.env.TOKEN = '';
		mongoose.connection.db.collection.mockImplementation((name) => ({
			find: () => ({
				project: () => ({
					toArray: async () => ([
						{ guild_id: 'active-a' },
						{ guild_id: 'active-b', command_count: 3 },
					]),
				}),
			}),
			updateOne: jest.fn(),
		}));

		const data = await loadContacts({ force: true });
		expect(data.guilds[0].guild_id).toBe('active-b');
		expect(data.guilds[1].guild_id).toBe('active-a');
	});

	it('loadContacts trie actifs par command_count decroissant', async () => {
		process.env.TOKEN = '';
		mongoose.connection.db.collection.mockImplementation((name) => ({
			find: () => ({
				project: () => ({
					toArray: async () => ([
						{ guild_id: 'active-low', command_count: 1 },
						{ guild_id: 'active-high', command_count: 99 },
					]),
				}),
			}),
			updateOne: jest.fn(),
		}));

		const data = await loadContacts({ force: true });
		expect(data.guilds[0].guild_id).toBe('active-high');
		expect(data.guilds[1].guild_id).toBe('active-low');
	});

	it('loadContacts trie inactifs par command_count decroissant', async () => {
		process.env.TOKEN = '';
		mongoose.connection.db.collection.mockImplementation((name) => ({
			find: () => ({
				project: () => ({
					toArray: async () => ([
						{ guild_id: 'left-low', left_at: '2026-01-01T00:00:00.000Z', command_count: 1 },
						{ guild_id: 'left-high', left_at: '2026-01-02T00:00:00.000Z', command_count: 50 },
					]),
				}),
			}),
			updateOne: jest.fn(),
		}));

		const data = await loadContacts({ force: true });
		expect(data.guilds[0].guild_id).toBe('left-high');
		expect(data.guilds[1].guild_id).toBe('left-low');
	});

	it('loadContacts backfills owner_id when guild record lacks one', async () => {
		process.env.TOKEN = 'bot-token';
		discordFetch.mockImplementation(async (url) => {
			if (url.startsWith('/guilds/g1')) {
				return { ok: true, data: { owner_id: 'fresh-owner' } };
			}
			if (url === '/users/fresh-owner') {
				return { ok: true, data: { id: 'fresh-owner', username: 'fresh' } };
			}
			return { ok: false, status: 404 };
		});
		const updateOne = jest.fn().mockResolvedValue({});
		mongoose.connection.db.collection.mockImplementation((name) => ({
			find: () => ({
				project: () => ({
					toArray: async () => ([{
						guild_id: 'g1',
						command_count: 1,
					}]),
				}),
			}),
			updateOne,
		}));

		await loadContacts({ force: true });
		expect(updateOne).toHaveBeenCalledWith(
			{ guild_id: 'g1' },
			{ $set: { owner_id: 'fresh-owner' } },
		);
	});

	it('loadContacts trie par command_count quand même statut actif', async () => {
		process.env.TOKEN = '';
		mongoose.connection.db.collection.mockImplementation((name) => ({
			find: () => ({
				project: () => ({
					toArray: async () => ([
						{ guild_id: 'g-low', command_count: 1 },
						{ guild_id: 'g-high', command_count: 50 },
					]),
				}),
			}),
			updateOne: jest.fn(),
		}));

		const data = await loadContacts({ force: true });
		expect(data.guilds.map((g) => g.guild_id)).toEqual(['g-high', 'g-low']);
	});

	it('loadContacts sort met actif avant inactif dans le comparateur', async () => {
		process.env.TOKEN = '';
		mongoose.connection.db.collection.mockImplementation((name) => ({
			find: () => ({
				project: () => ({
					toArray: async () => ([
						{ guild_id: 'inactive', left_at: '2026-01-01T00:00:00.000Z', command_count: 99 },
						{ guild_id: 'active', command_count: 1 },
					]),
				}),
			}),
			updateOne: jest.fn(),
		}));

		const data = await loadContacts({ force: true });
		expect(data.guilds[0].guild_id).toBe('active');
		expect(data.guilds[1].guild_id).toBe('inactive');
	});

	it('loadContacts trie actifs avant inactifs puis command_count', async () => {
		mongoose.connection.db.collection.mockImplementation((name) => ({
			find: () => ({
				project: () => ({
					toArray: async () => ([
						{ guild_id: 'left-high', left_at: '2026-01-01T00:00:00.000Z', command_count: 99 },
						{ guild_id: 'active-low', command_count: 0 },
						{ guild_id: 'active-high', command_count: 5 },
					]),
				}),
			}),
			updateOne: jest.fn(),
		}));

		const data = await loadContacts({ force: true });
		expect(data.guilds.map((g) => g.guild_id)).toEqual([
			'active-high',
			'active-low',
			'left-high',
		]);
		expect(data.guilds[1].command_count).toBe(0);
	});

	it('loadContacts resolveUser sans token retourne fallback', async () => {
		delete process.env.TOKEN;
		mongoose.connection.db.collection.mockImplementation((name) => ({
			find: () => ({
				project: () => ({
					toArray: async () => ([{
						guild_id: 'g1',
						name: 'Guild',
						owner_id: 'owner-1',
					}]),
				}),
			}),
			updateOne: jest.fn(),
		}));

		const data = await loadContacts({ force: true });
		expect(data.guilds[0].owner).toMatchObject({
			user_id: 'owner-1',
			display_name: 'owner-1',
		});
		expect(discordFetch).not.toHaveBeenCalled();
	});

	it('loadContacts resolveUser ignore id legacy et vide', async () => {
		expect(bumpCreator(new Map(), 'g1', '0', 'stockpiles')).toBeUndefined();
		expect(bumpCreator(new Map(), 'g1', '', 'stockpiles')).toBeUndefined();
	});

	it('loadContacts n alerte pas sur user HTTP 404', async () => {
		process.env.TOKEN = 'bot-token';
		discordFetch.mockImplementation(async (url) => {
			if (url.startsWith('/guilds/')) return { ok: true, data: { owner_id: 'u404' } };
			if (url === '/users/u404') return { ok: false, status: 404 };
			return { ok: false, status: 404 };
		});
		mongoose.connection.db.collection.mockImplementation((name) => ({
			find: () => ({
				project: () => ({
					toArray: async () => ([{ guild_id: 'g1', name: 'G', owner_id: 'u404' }]),
				}),
			}),
			updateOne: jest.fn(),
		}));

		const data = await loadContacts({ force: true });
		expect(data.warnings).toEqual([]);
		expect(data.guilds[0].owner.display_name).toBe('u404');
	});

	it('loadContacts skip discord guild fetch pour guild inactif', async () => {
		process.env.TOKEN = 'bot-token';
		discordFetch.mockClear();
		mongoose.connection.db.collection.mockImplementation((name) => ({
			find: () => ({
				project: () => ({
					toArray: async () => ([{
						guild_id: 'g-left',
						left_at: '2026-01-01T00:00:00.000Z',
						command_count: 1,
					}]),
				}),
			}),
			updateOne: jest.fn(),
		}));

		await loadContacts({ force: true });
		expect(discordFetch).not.toHaveBeenCalled();
	});

	it('loadContacts backfill owner quand Discord diffère de stats', async () => {
		process.env.TOKEN = 'bot-token';
		const updateOne = jest.fn().mockResolvedValue({});
		discordFetch.mockImplementation(async (url) => {
			if (url.startsWith('/guilds/g1')) return { ok: true, data: { owner_id: 'new-owner' } };
			if (url === '/users/new-owner') return { ok: true, data: { id: 'new-owner', username: 'new' } };
			return { ok: false, status: 404 };
		});
		mongoose.connection.db.collection.mockImplementation((name) => ({
			find: () => ({
				project: () => ({
					toArray: async () => ([{
						guild_id: 'g1',
						name: 'G',
						command_count: 1,
						owner_id: 'old-owner',
					}]),
				}),
			}),
			updateOne,
		}));

		const data = await loadContacts({ force: true });
		expect(data.guilds[0].owner_id).toBe('new-owner');
		expect(updateOne).toHaveBeenCalledWith(
			{ guild_id: 'g1' },
			{ $set: { owner_id: 'new-owner' } },
		);
	});

	it('loadContacts uses guild_id fallback and skips invalid owner ids in people map', async () => {
		mongoose.connection.db.collection.mockImplementation((name) => ({
			find: () => ({
				project: () => ({
					toArray: async () => ([{
						guild_id: 'g1',
						command_count: 2,
						owner_id: '0',
					}]),
				}),
			}),
			updateOne: jest.fn(),
		}));

		const data = await loadContacts({ force: true });
		expect(data.guilds[0].name).toBe('g1');
		expect(data.guilds[0].owner).toBeNull();
		expect(data.people).toEqual([]);
	});
});
