'use strict';

const {
	WIKI_SCAN_CATEGORIES,
	WIKI_HUB_TITLES,
	PRUNE_CATALOG_ITEM_NAMES,
	RESOURCE_NAME_TO_REL,
} = require('../../../scripts/lib/wiki-sync/config');

describe('wiki-sync / config', () => {
	it('WIKI_SCAN_CATEGORIES couvre les catégories attendues', () => {
		expect(WIKI_SCAN_CATEGORIES).toContain('Category:Ammunition');
		expect(WIKI_SCAN_CATEGORIES).toContain('Category:Vehicles');
	});

	it('WIKI_HUB_TITLES exclut les pages hub connues', () => {
		expect(WIKI_HUB_TITLES.has('Aircraft')).toBe(true);
		expect(WIKI_HUB_TITLES.has('Flamethrower Ammo')).toBe(true);
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
