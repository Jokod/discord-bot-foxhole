'use strict';

jest.mock('../../../scripts/lib/wiki-sync/config', () => ({
	BATCH_SIZE: 2,
	BATCH_DELAY_MS: 0,
	WIKI_HUB_TITLES: new Set(),
	WIKI_SCAN_CATEGORIES: ['CatA'],
	WIKI_EXTRA_SCAN_TITLES: ['Extra Page'],
	WIKI_NOT_LOGISTICS_TITLES: new Set(),
	WIKI_COVERED_BY_CATALOG_HUBS: new Set(),
}));

jest.mock('../../../scripts/lib/wiki-sync/wiki/title-resolver', () => ({
	sleep: jest.fn(async () => undefined),
	isFrenchUniformEntry: jest.fn(() => false),
	inferWikiTitle: jest.fn((name) => name),
	resolveWikiTitle: jest.fn((requested) => requested),
	wikiFactionToArray: jest.fn(() => ['colonial']),
	canonicalInfoboxNameForCatalog: jest.fn((name) => name),
}));

jest.mock('../../../scripts/lib/wiki-sync/wiki/infobox-parser', () => ({
	extractFirstInfoboxFaction: jest.fn(() => 'Colonial'),
	parseItemOrVehicleInfobox: jest.fn(),
}));

jest.mock('../../../scripts/lib/wiki-sync/wiki/description', () => ({
	descriptionFromWikitext: jest.fn(() => 'new desc'),
}));

jest.mock('../../../scripts/lib/wiki-sync/wiki/router', () => ({
	routeWikiInfoboxToMaterialFile: jest.fn(),
}));

jest.mock('../../../scripts/lib/wiki-sync/wiki/sync-icons', () => ({
	runSyncMaterialIcons: jest.fn(async (opts) => {
		if (opts.fetchWikitext) {
			await opts.fetchWikitext(['IconProbe']);
		}
		if (opts.log) {
			opts.log('sync-icons-log');
		}
		return { downloaded: 1, skippedExisting: 0, failed: 0 };
	}),
}));

jest.mock('../../../scripts/lib/wiki-sync/core/catalog', () => {
	const actual = jest.requireActual('../../../scripts/lib/wiki-sync/core/catalog');
	return {
		...actual,
		loadAllMaterialFiles: jest.fn(() => [{ filePath: '/tmp/x.json', materials: [] }]),
		writeMaterialFile: jest.fn((_fp, materials) => materials),
		applyCatalogMaintenance: jest.fn((groups) => groups),
		flushModifiedMaterialFiles: jest.fn(),
	};
});

const { PageCache } = require('../../../scripts/lib/wiki-sync/wiki/cache');
const { RateLimiter } = require('../../../scripts/lib/wiki-sync/wiki/rate-limiter');
const {
	loadAllMaterialFiles,
	applyCatalogMaintenance,
} = require('../../../scripts/lib/wiki-sync/core/catalog');
const { runSyncMaterialIcons } = require('../../../scripts/lib/wiki-sync/wiki/sync-icons');
const { parseItemOrVehicleInfobox } = require('../../../scripts/lib/wiki-sync/wiki/infobox-parser');
const { routeWikiInfoboxToMaterialFile } = require('../../../scripts/lib/wiki-sync/wiki/router');
const {
	isWriteAllowed,
	runWikiSync,
	runAddMissing,
	runSyncDescriptionsAndFactions,
} = require('../../../scripts/lib/wiki-sync/core/pipeline');

describe('wiki-sync / pipeline', () => {
	const materialsRoot = '/tmp/materials';
	const iconsDir = '/tmp/icons';
	const fp = '/tmp/x.json';
	const originalWriteFlag = process.env.WIKI_SYNC_WRITE;

	beforeEach(() => {
		jest.clearAllMocks();
		delete process.env.WIKI_SYNC_WRITE;
		loadAllMaterialFiles.mockReturnValue([{ filePath: fp, materials: [] }]);
		applyCatalogMaintenance.mockImplementation((groups) => groups);
	});

	afterEach(() => {
		if (originalWriteFlag === undefined) {
			delete process.env.WIKI_SYNC_WRITE;
		}
		else {
			process.env.WIKI_SYNC_WRITE = originalWriteFlag;
		}
	});

	describe('isWriteAllowed', () => {
		it('refuse l’écriture en dry-run', () => {
			expect(isWriteAllowed({ dryRun: true, dashboard: false })).toBe(false);
		});

		it('autorise l’écriture hors dashboard', () => {
			expect(isWriteAllowed({ dryRun: false, dashboard: false })).toBe(true);
		});

		it('dashboard exige WIKI_SYNC_WRITE=1 ou true', () => {
			expect(isWriteAllowed({ dryRun: false, dashboard: true })).toBe(false);
			process.env.WIKI_SYNC_WRITE = '1';
			expect(isWriteAllowed({ dryRun: false, dashboard: true })).toBe(true);
			process.env.WIKI_SYNC_WRITE = 'true';
			expect(isWriteAllowed({ dryRun: false, dashboard: true })).toBe(true);
		});
	});

	describe('runAddMissing', () => {
		it('inclut WIKI_EXTRA_SCAN_TITLES dans les candidats', async () => {
			const fetchCategoryPageTitles = jest.fn(async () => new Set());
			const fetchWikitextForTitles = jest.fn(async () => new Map());
			const stderr = jest.spyOn(process.stderr, 'write').mockImplementation(() => true);

			await runAddMissing(true, materialsRoot, [{ filePath: fp, materials: [] }], {
				wikiClient: { fetchCategoryPageTitles, fetchWikitextForTitles },
			});

			expect(fetchWikitextForTitles).toHaveBeenCalledWith(['Extra Page']);
			stderr.mockRestore();
		});

		it('utilise le client wiki module par défaut sans injection', async () => {
			const originalFetch = global.fetch;
			global.fetch = jest.fn()
				.mockResolvedValueOnce({
					json: async () => ({ query: { categorymembers: [] } }),
				})
				.mockResolvedValueOnce({
					json: async () => ({
						query: { pages: {}, normalized: [], redirects: [] },
					}),
				});
			const stderr = jest.spyOn(process.stderr, 'write').mockImplementation(() => true);

			await runAddMissing(true, materialsRoot, [{ filePath: fp, materials: [] }]);

			expect(global.fetch).toHaveBeenCalled();
			global.fetch = originalFetch;
			stderr.mockRestore();
		});
	});

	describe('runSyncDescriptionsAndFactions', () => {
		it('accepte les opts par défaut', async () => {
			const fetchWikitextForTitles = jest.fn(async () => new Map());
			const materials = [{ itemName: 'A', itemDesc: 'old', faction: ['colonial'] }];
			const stderr = jest.spyOn(process.stderr, 'write').mockImplementation(() => true);

			await runSyncDescriptionsAndFactions([{ filePath: fp, materials }], {
				wikiClient: { fetchWikitextForTitles },
			});

			stderr.mockRestore();
		});
		it('utilise wikiClient injecté et remplit le cache', async () => {
			const cache = new PageCache();
			const wikitext = '{{Item Infobox|name=A}}';
			const fetchWikitextForTitles = jest.fn(async (batch) => {
				const map = new Map();
				for (const t of batch) map.set(t, wikitext);
				return map;
			});
			const materials = [{ itemName: 'A', itemDesc: 'old', faction: ['colonial'] }];
			const stderr = jest.spyOn(process.stderr, 'write').mockImplementation(() => true);

			await runSyncDescriptionsAndFactions([{ filePath: fp, materials }], {
				dryRun: true,
				descOnly: true,
				wikiClient: { fetchWikitextForTitles },
				cache,
			});

			expect(cache.has('A')).toBe(true);
			expect(cache.get('A')).toBe(wikitext);
			stderr.mockRestore();
		});

		it('crée un client wiki si cache ou rateLimiter fourni sans wikiClient', async () => {
			const cache = new PageCache();
			const rateLimiter = new RateLimiter({ minIntervalMs: 0, maxRequests: 10, sleepFn: async () => undefined });
			const fetchImpl = jest.fn().mockResolvedValue({
				json: async () => ({
					query: {
						pages: {
							'1': {
								title: 'B',
								revisions: [{ slots: { main: { '*': 'wt' } } }],
							},
						},
						normalized: [],
						redirects: [],
					},
				}),
			});
			const { createWikiClient } = jest.requireActual('../../../scripts/lib/wiki-sync/wiki/client');
			const materials = [{ itemName: 'B', itemDesc: 'old', faction: ['colonial'] }];
			const stderr = jest.spyOn(process.stderr, 'write').mockImplementation(() => true);

			await runSyncDescriptionsAndFactions([{ filePath: fp, materials }], {
				dryRun: true,
				cache,
				rateLimiter,
				wikiClient: createWikiClient({ cache, rateLimiter, fetchImpl }),
			});

			expect(fetchImpl).toHaveBeenCalled();
			stderr.mockRestore();
		});

		it('utilise createWikiClient via resolveWikiClient quand cache fourni sans wikiClient', async () => {
			const cache = new PageCache();
			cache.set('B', 'wt');
			const materials = [{ itemName: 'B', itemDesc: 'old', faction: ['colonial'] }];
			const stderr = jest.spyOn(process.stderr, 'write').mockImplementation(() => true);

			await runSyncDescriptionsAndFactions([{ filePath: fp, materials }], {
				dryRun: true,
				descOnly: true,
				cache,
			});

			expect(cache.has('B')).toBe(true);
			stderr.mockRestore();
		});
	});

	describe('runWikiSync', () => {
		function wikiFetchImpl() {
			return jest.fn(async (url) => {
				const u = new URL(String(url));
				if (u.searchParams.get('list') === 'categorymembers') {
					return {
						json: async () => ({
							query: { categorymembers: [] },
						}),
					};
				}
				return {
					json: async () => ({
						query: {
							pages: {},
							normalized: [],
							redirects: [],
						},
					}),
				};
			});
		}

		it('lève si materialsRoot absent', async () => {
			await expect(runWikiSync()).rejects.toThrow(/materialsRoot requis/);
		});

		it('force effectiveDryRun en mode dashboard sans WIKI_SYNC_WRITE', async () => {
			const onProgress = jest.fn();
			const log = jest.fn();
			const result = await runWikiSync({
				materialsRoot,
				iconsDir,
				dashboard: true,
				onProgress,
				log,
			});

			expect(result.dryRun).toBe(true);
			expect(onProgress).toHaveBeenCalledWith(expect.objectContaining({ phase: 'start', dryRun: true }));
			expect(onProgress).toHaveBeenCalledWith({ phase: 'done' });
			expect(result.phases.length).toBeGreaterThan(0);
		});

		it('add-missing-only s’arrête avant descriptions/factions', async () => {
			const stderr = jest.spyOn(process.stderr, 'write').mockImplementation(() => true);

			const result = await runWikiSync({
				materialsRoot,
				addMissingOnly: true,
				fetchImpl: wikiFetchImpl(),
			});

			expect(result.materials).toBeTruthy();
			expect(result.phases).toEqual(expect.arrayContaining([
				expect.objectContaining({ name: 'maintenance' }),
				expect.objectContaining({ name: 'add-missing' }),
			]));
			expect(stderr.mock.calls.map((c) => c[0]).join('')).toContain('--add-missing-only');
			stderr.mockRestore();
		});

		it('add-missing puis sync descriptions/factions', async () => {
			const stderr = jest.spyOn(process.stderr, 'write').mockImplementation(() => true);
			const materials = [{ itemName: 'Existing', itemDesc: 'old', faction: ['colonial'] }];
			loadAllMaterialFiles.mockReturnValue([{ filePath: fp, materials }]);

			await runWikiSync({
				materialsRoot,
				addMissing: true,
				fetchImpl: wikiFetchImpl(),
			});

			expect(stderr.mock.calls.map((c) => c[0]).join('')).toContain('descriptions / factions');
			stderr.mockRestore();
		});

		it('sync-icons sans passe descriptions si syncIcons actif', async () => {
			const log = jest.fn();

			const result = await runWikiSync({
				materialsRoot,
				iconsDir,
				syncIcons: true,
				forceIcons: true,
				log,
				fetchImpl: wikiFetchImpl(),
			});

			expect(runSyncMaterialIcons).toHaveBeenCalledWith(expect.objectContaining({
				materialsRoot,
				iconsDir,
				force: true,
				log,
			}));
			expect(result.icons).toEqual({ downloaded: 1, skippedExisting: 0, failed: 0 });
		});

		it('sync-icons utilise le log stderr par défaut', async () => {
			const stderr = jest.spyOn(process.stderr, 'write').mockImplementation(() => true);

			await runWikiSync({
				materialsRoot,
				iconsDir,
				syncIcons: true,
				fetchImpl: wikiFetchImpl(),
			});

			expect(runSyncMaterialIcons).toHaveBeenCalledWith(expect.objectContaining({
				log: expect.any(Function),
			}));
			const passedLog = runSyncMaterialIcons.mock.calls[0][0].log;
			passedLog('icone-test');
			expect(stderr).toHaveBeenCalledWith('icone-test\n');

			stderr.mockRestore();
		});

		it('autorise l’écriture dashboard avec WIKI_SYNC_WRITE', async () => {
			process.env.WIKI_SYNC_WRITE = '1';

			const result = await runWikiSync({
				materialsRoot,
				dashboard: true,
				fetchImpl: wikiFetchImpl(),
			});

			expect(result.dryRun).toBe(false);
		});

		it('interrompt quand shouldAbort devient vrai', async () => {
			let calls = 0;
			await expect(runWikiSync({
				materialsRoot,
				fetchImpl: wikiFetchImpl(),
				shouldAbort: () => {
					calls += 1;
					return calls > 1;
				},
			})).rejects.toMatchObject({ code: 'WIKI_SYNC_ABORTED' });
		});
	});
});
