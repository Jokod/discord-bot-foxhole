'use strict';

const {
	WIKI_SCAN_CATEGORIES,
	WIKI_HUB_TITLES,
	PRUNE_CATALOG_ITEM_NAMES,
} = require('../../../scripts/lib/wiki-sync/config');
const { RESOURCE_NAME_TO_REL } = require('../../../scripts/lib/wiki-sync/config/routing/rules');

describe('wiki-sync / config', () => {
	afterEach(() => {
		delete process.env.WIKI_SYNC_BATCH_DELAY_MS;
		delete process.env.WIKI_SYNC_MIN_INTERVAL_MS;
		delete process.env.WIKI_SYNC_CONCURRENCY;
		delete process.env.WIKI_SYNC_MAX_REQUESTS_PER_RUN;
	});

	it('envInt retombe sur fallback pour valeur vide ou invalide', () => {
		jest.resetModules();
		process.env.WIKI_SYNC_BATCH_DELAY_MS = '';
		process.env.WIKI_SYNC_MIN_INTERVAL_MS = 'abc';
		process.env.WIKI_SYNC_CONCURRENCY = '-1';
		const api = require('../../../scripts/lib/wiki-sync/config/api');
		expect(api.BATCH_DELAY_MS).toBe(2000);
		expect(api.MIN_INTERVAL_MS).toBe(0);
		expect(api.CONCURRENCY).toBe(1);
	});

	it('envInt lit les entiers positifs depuis process.env', () => {
		jest.resetModules();
		process.env.WIKI_SYNC_BATCH_DELAY_MS = '1500';
		process.env.WIKI_SYNC_MAX_REQUESTS_PER_RUN = '42';
		const api = require('../../../scripts/lib/wiki-sync/config/api');
		expect(api.BATCH_DELAY_MS).toBe(1500);
		expect(api.MAX_REQUESTS_PER_RUN).toBe(42);
	});

	it('WIKI_SCAN_CATEGORIES couvre les catégories attendues', () => {
		expect(WIKI_SCAN_CATEGORIES).toContain('Category:Ammunition');
		expect(WIKI_SCAN_CATEGORIES).toContain('Category:Uniforms');
		expect(WIKI_SCAN_CATEGORIES).toContain('Category:Vehicles');
		expect(WIKI_SCAN_CATEGORIES).toContain('Category:Aircraft Parts');
		expect(WIKI_SCAN_CATEGORIES).toContain('Category:Transport Aircraft');
	});

	it('WIKI_EXTRA_SCAN_TITLES couvre les avions sans catégorie typée', () => {
		const { WIKI_EXTRA_SCAN_TITLES } = require('../../../scripts/lib/wiki-sync/config');
		expect(WIKI_EXTRA_SCAN_TITLES).toEqual(expect.arrayContaining([
			'A59 Venti \u201cPerdix\u201d',
			'Luminary Mk. VI Emissary',
		]));
	});

	it('WIKI_HUB_TITLES exclut les pages hub connues', () => {
		expect(WIKI_HUB_TITLES.has('Aircraft')).toBe(true);
		expect(WIKI_HUB_TITLES.has('Flamethrower Ammo')).toBe(true);
		expect(WIKI_HUB_TITLES.has('R-Series Vehicles')).toBe(true);
	});

	it('PRUNE_CATALOG_ITEM_NAMES contient les alias RPG ASCII', () => {
		expect(PRUNE_CATALOG_ITEM_NAMES.has('AP/RPG')).toBe(true);
		expect(PRUNE_CATALOG_ITEM_NAMES.has('ARC/RPG')).toBe(true);
	});

	it('RESOURCE_NAME_TO_REL mappe les ressources logi courantes', () => {
		expect(RESOURCE_NAME_TO_REL.Salvage.relPath).toBe('resources/salvage.json');
		expect(RESOURCE_NAME_TO_REL['Basic Materials'].relPath).toBe('resources/bmat.json');
	});
});
