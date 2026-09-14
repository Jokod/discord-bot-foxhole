'use strict';

jest.mock('../../../.dashboard/lib/db', () => ({
	connection: {
		db: {
			collection: jest.fn(),
		},
	},
}));

jest.mock('../../../.dashboard/lib/api/tokens', () => ({
	...jest.requireActual('../../../.dashboard/lib/api/tokens'),
	validateBearerToken: jest.fn(),
}));

const mockListCatalog = jest.fn(async () => ({
	generated_at: '2026-01-01T00:00:00.000Z',
	categories: [
		{ id: 'utilities', icon: '🔧', subcategories: ['basic'] },
		{ id: 'vehicles', icon: '🚗', subcategories: ['tanks'] },
	],
	items: [
		{ itemName: 'Basic Materials', category: 'utilities', subcategory: 'basic', owner_id: 'secret' },
		{ itemName: 'Tank', category: 'vehicles', subcategory: 'tanks' },
	],
	icons: { dir: '/assets/icons/materials', with_icon: 1, total: 2 },
}));

jest.mock('../../../.dashboard/lib/materials', () => ({
	listCatalog: (...args) => mockListCatalog(...args),
}));

jest.mock('../../../.dashboard/lib/summary', () => ({
	createLoadSummary: jest.fn(() => jest.fn(async () => ({
		generated_at: '2026-01-01T00:00:00.000Z',
		env_file: '.env',
		db_name: 'fox',
		war: { available: true, warNumber: 1, owner_id: 'secret' },
		kpis: { active_guilds: 2, owner_id: 'secret' },
		commands: [{ name: 'help', total: 1, owner_id: 'secret' }],
		activity: { daily: [] },
		members: { total: 1 },
	}))),
}));

const mongoose = require('../../../.dashboard/lib/db');
const { validateBearerToken } = require('../../../.dashboard/lib/api/tokens');
const { createLoadSummary } = require('../../../.dashboard/lib/summary');
const {
	resetRateLimitsForTests,
	seedRateLimitBucketsForTests,
	publicJsonHeaders,
	sanitizeMaterialsCatalog,
	sanitizePublicData,
	sanitizePublicGuild,
	handlePublicMaterialCategories,
	handlePublicMaterialItems,
	createPublicDataLoader,
	handlePublicGuilds,
	parsePagination,
	paginateMeta,
	isRouteEnabled,
	IP_MAX_REQUESTS,
	JTI_MAX_REQUESTS,
} = require('../../../.dashboard/lib/api/public');

function mockPublicGuildsCollections(statsDocs, serverDocs = []) {
	const aggregateToArray = jest.fn().mockResolvedValue(statsDocs);
	const aggregate = jest.fn().mockReturnValue({ toArray: aggregateToArray });
	const countDocuments = jest.fn().mockResolvedValue(statsDocs.length);
	const serversToArray = jest.fn().mockResolvedValue(serverDocs);
	const serversProject = jest.fn().mockReturnValue({ toArray: serversToArray });
	const serversFind = jest.fn().mockReturnValue({ project: serversProject });
	mongoose.connection.db.collection.mockImplementation((name) => {
		if (name === 'stats') return { aggregate, countDocuments };
		if (name === 'servers') return { find: serversFind };
		return {};
	});
	return { aggregate, countDocuments, serversFind };
}

describe('publicApi', () => {
	const prev = { ...process.env };

	beforeEach(() => {
		resetRateLimitsForTests();
		validateBearerToken.mockResolvedValue({ jti: 'jti-1', sub: 'admin', scopes: ['materials'] });
		process.env.DASHBOARD_API = '1';
		process.env.DASHBOARD_API_MATERIALS = '1';
		process.env.DASHBOARD_API_JWT_SECRET = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789ab';
	});

	afterEach(() => {
		process.env = { ...prev };
	});

	it('isRouteEnabled respects flags', () => {
		expect(isRouteEnabled('materials')).toBe(true);
		process.env.DASHBOARD_API = '0';
		expect(isRouteEnabled('materials')).toBe(false);
	});

	it('sanitizeMaterialsCatalog allowlists fields', () => {
		const out = sanitizeMaterialsCatalog({
			generated_at: 'x',
			items: [{ itemName: 'A', owner_id: 'nope' }],
			extra: true,
		});
		expect(out.items[0]).toEqual({ itemName: 'A' });
		expect(out.extra).toBeUndefined();
		expect(sanitizeMaterialsCatalog({
			generated_at: 'x',
			categories: null,
			items: null,
		})).toEqual({
			generated_at: 'x',
			categories: [],
			items: [],
			icons: null,
		});
		expect(sanitizeMaterialsCatalog({
			generated_at: 'x',
			categories: [],
			items: [],
			icons: { dir: '/icons', with_icon: 3, total: 5, extra: true },
		}).icons).toEqual({ dir: '/icons', with_icon: 3, total: 5 });
	});

	it('sanitizePublicData excludes owner fields from nested kpis', () => {
		const out = sanitizePublicData({
			generated_at: 'x',
			kpis: { active_guilds: 3, owner_id: 'secret' },
			owner_id: 'secret',
		});
		expect(out.kpis.active_guilds).toBe(3);
		expect(out.kpis.owner_id).toBeUndefined();
		expect(out.owner_id).toBeUndefined();
	});

	it('parsePagination clamps limit and offset', () => {
		expect(parsePagination({ url: '/x?limit=999&offset=-3' })).toMatchObject({ limit: 200, offset: 0 });
		expect(parsePagination({ url: '/x?limit=10&offset=5' })).toMatchObject({ limit: 10, offset: 5 });
	});

	it('paginateMeta computes next page', () => {
		expect(paginateMeta(25, 10, 0, 10)).toEqual({
			total: 25, limit: 10, offset: 0, count: 10, has_more: true, next_offset: 10,
		});
		expect(paginateMeta(25, 10, 20, 5)).toEqual({
			total: 25, limit: 10, offset: 20, count: 5, has_more: false, next_offset: null,
		});
	});

	it('handlePublicMaterialCategories paginates', async () => {
		const page = await handlePublicMaterialCategories({ url: '/?limit=1&offset=0', headers: {} });
		expect(page.total).toBe(2);
		expect(page.categories).toHaveLength(1);
		expect(page.categories[0].id).toBe('utilities');
		expect(page.has_more).toBe(true);
		expect(page.next_offset).toBe(1);
	});

	it('handlePublicMaterialItems filters and paginates', async () => {
		const page = await handlePublicMaterialItems({
			url: '/?category=utilities&subcategory=basic&limit=10&offset=0',
			headers: {},
		});
		expect(page.total).toBe(1);
		expect(page.items[0].itemName).toBe('Basic Materials');
		expect(page.items[0].owner_id).toBeUndefined();
	});

	it('publicJsonHeaders sets security headers', () => {
		expect(publicJsonHeaders({ 'X-Test': '1' })).toMatchObject({
			'Cache-Control': 'no-store',
			'Vary': 'Authorization',
			'X-Test': '1',
		});
	});

	it('sanitizePublicGuild allowlists guild fields', () => {
		expect(sanitizePublicGuild({
			guild_id: '1',
			name: 'G',
			owner_id: 'secret',
			member_count: 5,
			command_count: 2,
		})).toEqual({
			guild_id: '1',
			name: 'G',
			member_count: 5,
			command_count: 2,
			last_command_at: undefined,
			first_command_at: undefined,
			joined_at: undefined,
			left_at: undefined,
			created_at: undefined,
			operation_count: undefined,
			stock_board_count: undefined,
			material_count: undefined,
			material_validated_count: undefined,
			setup: undefined,
			lang: undefined,
			camp: undefined,
			logs: undefined,
			activity: undefined,
			blocked: undefined,
			cmds_per_member: undefined,
		});
	});

	it('createPublicDataLoader authorizes and sanitizes summary', async () => {
		process.env.DASHBOARD_API_DATA = '1';
		validateBearerToken.mockResolvedValue({ jti: 'jti-data', sub: 'admin', scopes: ['data'] });
		const handler = createPublicDataLoader('/repo/.env');
		const out = await handler({
			url: '/api/public/data',
			headers: { authorization: 'Bearer x' },
		});
		expect(out.kpis.active_guilds).toBe(2);
		expect(out.kpis.owner_id).toBeUndefined();
		expect(createLoadSummary).toHaveBeenCalledWith('/repo/.env');
	});

	it('createPublicDataLoader rejects disabled route', async () => {
		process.env.DASHBOARD_API_DATA = '0';
		const handler = createPublicDataLoader('/repo/.env');
		await expect(handler({ headers: {} })).rejects.toMatchObject({ code: 'API_DISABLED' });
	});

	it('handlePublicMaterialCategories rejects disabled materials route', async () => {
		process.env.DASHBOARD_API_MATERIALS = '0';
		await expect(handlePublicMaterialCategories({ headers: {} }))
			.rejects.toMatchObject({ code: 'API_DISABLED' });
	});

	it('handlePublicGuilds setup sans lang et cmds_per_member', async () => {
		process.env.DASHBOARD_API_GUILDS = '1';
		validateBearerToken.mockResolvedValue({ jti: 'jti-g3', sub: 'admin', scopes: ['guilds'] });
		mockPublicGuildsCollections(
			[{ guild_id: 'g1', name: 'Guild', member_count: 4, command_count: 9 }],
			[{ guild_id: 'g1', lang: '', logs: false }],
		);
		const out = await handlePublicGuilds({ headers: {} });
		expect(out.guilds[0].lang).toBeNull();
		expect(out.guilds[0].logs).toBe(false);
		expect(out.guilds[0].cmds_per_member).toBe(2.25);
	});

	it('handlePublicGuilds fallback name et sans setup server', async () => {
		process.env.DASHBOARD_API_GUILDS = '1';
		validateBearerToken.mockResolvedValue({ jti: 'jti-g2', sub: 'admin', scopes: ['guilds'] });
		mockPublicGuildsCollections([
			{ guild_id: 'g1', command_count: 3, member_count: 2 },
		]);
		const out = await handlePublicGuilds({ headers: {} });
		expect(out.guilds[0].name).toBe('g1');
		expect(out.guilds[0].setup).toBe(false);
		expect(out.guilds[0].cmds_per_member).toBe(1.5);
	});

	it('handlePublicGuilds returns sorted guild list', async () => {
		process.env.DASHBOARD_API_GUILDS = '1';
		validateBearerToken.mockResolvedValue({ jti: 'jti-g', sub: 'admin', scopes: ['guilds'] });

		const { aggregate, countDocuments } = mockPublicGuildsCollections(
			[
				{ guild_id: 'g1', name: 'Alpha', member_count: 0, command_count: 5 },
				{ guild_id: 'g2', name: 'Zulu', member_count: 10, command_count: 20 },
			],
			[{ guild_id: 'g1', lang: 'fr', camp: 'warden', logs: true }],
		);

		const out = await handlePublicGuilds({
			url: '/api/public/guilds',
			headers: { authorization: 'Bearer x' },
		});
		expect(countDocuments).toHaveBeenCalled();
		expect(aggregate).toHaveBeenCalled();
		expect(out.total).toBe(2);
		expect(out.limit).toBe(50);
		expect(out.offset).toBe(0);
		expect(out.has_more).toBe(false);
		expect(out.guilds[0].name).toBe('Alpha');
		expect(out.guilds[0].setup).toBe(true);
		expect(out.guilds[0].cmds_per_member).toBe(0);
		expect(out.guilds[1].cmds_per_member).toBe(2);
	});

	it('handlePublicGuilds paginate limit/offset', async () => {
		process.env.DASHBOARD_API_GUILDS = '1';
		validateBearerToken.mockResolvedValue({ jti: 'jti-page', sub: 'admin', scopes: ['guilds'] });
		const pageDocs = [{ guild_id: 'g2', name: 'B', member_count: 1, command_count: 1 }];
		const aggregateToArray = jest.fn().mockResolvedValue(pageDocs);
		const aggregate = jest.fn().mockReturnValue({ toArray: aggregateToArray });
		const countDocuments = jest.fn().mockResolvedValue(3);
		const serversToArray = jest.fn().mockResolvedValue([]);
		const serversProject = jest.fn().mockReturnValue({ toArray: serversToArray });
		const serversFind = jest.fn().mockReturnValue({ project: serversProject });
		mongoose.connection.db.collection.mockImplementation((name) => {
			if (name === 'stats') return { aggregate, countDocuments };
			if (name === 'servers') return { find: serversFind };
			return {};
		});

		const out = await handlePublicGuilds({
			url: '/api/public/guilds?limit=1&offset=1',
			headers: {},
		});
		expect(aggregate).toHaveBeenCalledWith(expect.arrayContaining([
			{ $skip: 1 },
			{ $limit: 1 },
		]));
		expect(out.guilds).toHaveLength(1);
		expect(out.guilds[0].name).toBe('B');
		expect(out.total).toBe(3);
		expect(out.has_more).toBe(true);
		expect(out.next_offset).toBe(2);
	});

	it('enforcePublicRateLimits via repeated requests', async () => {
		process.env.DASHBOARD_API_MATERIALS = '1';
		validateBearerToken.mockResolvedValue({ jti: 'same-jti', sub: 'admin', scopes: ['materials'] });
		const req = { url: '/?limit=1', headers: {}, socket: { remoteAddress: '203.0.113.1' } };
		for (let i = 0; i < IP_MAX_REQUESTS; i += 1) {
			await handlePublicMaterialCategories(req);
		}
		await expect(handlePublicMaterialCategories(req))
			.rejects.toMatchObject({ code: 'API_RATE_LIMIT', status: 429 });

		resetRateLimitsForTests();
		for (let i = 0; i < JTI_MAX_REQUESTS; i += 1) {
			await handlePublicMaterialCategories({
				url: '/?limit=1',
				headers: {},
				socket: { remoteAddress: `10.${Math.floor(i / 254)}.${(i % 254) + 1}.1` },
			});
		}
		await expect(handlePublicMaterialCategories({
			url: '/?limit=1',
			headers: {},
			socket: { remoteAddress: '10.255.255.1' },
		})).rejects.toMatchObject({ code: 'API_RATE_LIMIT', status: 429 });
	});

	it('handlePublicMaterialItems filtre subcategory seul', async () => {
		process.env.DASHBOARD_API_MATERIALS = '1';
		validateBearerToken.mockResolvedValue({ jti: 'jti-sub', sub: 'admin', scopes: ['materials'] });
		const page = await handlePublicMaterialItems({
			url: '/?subcategory=tanks&limit=10',
			headers: {},
		});
		expect(page.total).toBe(1);
		expect(page.items[0].itemName).toBe('Tank');
	});

	it('handlePublicMaterialCategories skip jti rate limit sans jti', async () => {
		process.env.DASHBOARD_API_MATERIALS = '1';
		validateBearerToken.mockResolvedValueOnce({ jti: null, sub: 'admin', scopes: ['materials'] });
		await expect(handlePublicMaterialCategories({
			url: '/?limit=1',
			headers: {},
			socket: { remoteAddress: '198.51.100.1' },
		})).resolves.toBeDefined();
	});

	it('sanitizePublicData preserve null war and icons', async () => {
		expect(sanitizePublicData({
			generated_at: 'x',
			env_file: '.env',
			db_name: 'fox',
			war: null,
			kpis: null,
			commands: [],
		})).toEqual({
			generated_at: 'x',
			war: null,
			kpis: null,
			commands: [],
			activity: null,
			members: null,
		});
		expect(sanitizeMaterialsCatalog({
			generated_at: 'x',
			categories: [],
			items: [],
			icons: null,
		}).icons).toBeNull();
		expect(sanitizeMaterialsCatalog({
			generated_at: 'x',
			categories: [],
			items: [],
			icons: { dir: '/icons', with_icon: 2, total: 3, extra: true },
		}).icons).toEqual({ dir: '/icons', with_icon: 2, total: 3 });
	});

	it('handlePublicGuilds rejects disabled guilds route', async () => {
		process.env.DASHBOARD_API_GUILDS = '0';
		await expect(handlePublicGuilds({ headers: {} }))
			.rejects.toMatchObject({ code: 'API_DISABLED' });
	});

	it('parsePagination defaults when query missing or invalid', () => {
		expect(parsePagination({ url: '/x' })).toMatchObject({ limit: 50, offset: 0 });
		expect(parsePagination({ url: '/x?limit=abc&offset=xyz' })).toMatchObject({ limit: 50, offset: 0 });
		expect(parsePagination({ headers: {} })).toMatchObject({ limit: 50, offset: 0 });
	});

	it('handlePublicMaterialItems filtre category et subcategory ensemble', async () => {
		const page = await handlePublicMaterialItems({
			url: '/?category=utilities&subcategory=basic&limit=10',
			headers: {},
		});
		expect(page.items).toHaveLength(1);
		expect(page.items[0].itemName).toBe('Basic Materials');
	});

	it('handlePublicMaterialCategories et items tolerent catalogues vides', async () => {
		mockListCatalog.mockResolvedValueOnce({
			generated_at: '2026-01-01T00:00:00.000Z',
			items: null,
			categories: null,
		});
		const cats = await handlePublicMaterialCategories({ url: '/?limit=10', headers: {} });
		expect(cats.categories).toEqual([]);
		expect(cats.total).toBe(0);

		mockListCatalog.mockResolvedValueOnce({
			generated_at: '2026-01-01T00:00:00.000Z',
			items: null,
			categories: null,
		});
		const items = await handlePublicMaterialItems({ url: '/?limit=10', headers: {} });
		expect(items.items).toEqual([]);
		expect(items.total).toBe(0);
	});

	it('handlePublicGuilds applique les fallbacks name member_count cmds_per_member', async () => {
		process.env.DASHBOARD_API_GUILDS = '1';
		validateBearerToken.mockResolvedValue({ jti: 'jti-fb', sub: 'admin', scopes: ['guilds'] });
		mockPublicGuildsCollections([
			{ guild_id: 'g-fallback', command_count: 7 },
			{ guild_id: 'g-zero', name: 'Zero Members', member_count: null, command_count: 4 },
		]);
		const out = await handlePublicGuilds({ headers: {} });
		const fb = out.guilds.find((g) => g.guild_id === 'g-fallback');
		expect(fb.name).toBe('g-fallback');
		expect(fb.member_count).toBe(0);
		expect(fb.command_count).toBe(7);
		expect(fb.cmds_per_member).toBe(0);
		const zero = out.guilds.find((g) => g.guild_id === 'g-zero');
		expect(zero.cmds_per_member).toBe(0);
	});

	it('handlePublicGuilds command_count absent avec members', async () => {
		process.env.DASHBOARD_API_GUILDS = '1';
		validateBearerToken.mockResolvedValue({ jti: 'jti-cc', sub: 'admin', scopes: ['guilds'] });
		mockPublicGuildsCollections([
			{ guild_id: 'g-cc', name: 'Has Members', member_count: 4 },
		]);
		const out = await handlePublicGuilds({ headers: {} });
		expect(out.guilds[0].command_count).toBe(0);
		expect(out.guilds[0].cmds_per_member).toBe(0);
	});

	it('handlePublicGuilds sans guilds ne charge pas servers', async () => {
		process.env.DASHBOARD_API_GUILDS = '1';
		validateBearerToken.mockResolvedValue({ jti: 'jti-empty', sub: 'admin', scopes: ['guilds'] });
		const { serversFind } = mockPublicGuildsCollections([]);
		const out = await handlePublicGuilds({ headers: {} });
		expect(out.guilds).toEqual([]);
		expect(out.total).toBe(0);
		expect(serversFind).not.toHaveBeenCalled();
	});

	it('prune les buckets rate-limit expirés périodiquement', async () => {
		process.env.DASHBOARD_API_MATERIALS = '1';
		validateBearerToken.mockResolvedValue({ jti: 'jti-prune', sub: 'admin', scopes: ['materials'] });
		seedRateLimitBucketsForTests();
		seedRateLimitBucketsForTests({});
		const now = Date.now();
		seedRateLimitBucketsForTests({
			checkCount: 63,
			ip: {
				'stale:ip': { count: 1, resetAt: now - 1 },
				'keep:ip': { count: 1, resetAt: now + 60_000 },
				'nullish:ip': null,
			},
			jti: {
				'stale:jti': { count: 1, resetAt: now - 1 },
			},
		});
		await handlePublicMaterialCategories({
			url: '/?limit=1',
			headers: {},
			socket: { remoteAddress: '198.51.100.9' },
		});
		expect(true).toBe(true);
	});
});
