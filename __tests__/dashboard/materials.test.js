'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { listCatalog, resolveIconUrl, loadManifest } = require('../../.dashboard/lib/materials');
const { PUBLIC_ICON_PREFIX } = require('../../scripts/lib/wiki-sync/sync-icons');

describe('dashboard materials catalog', () => {
	it('lists items with category / subcategory from data/materials', () => {
		const catalog = listCatalog();
		expect(catalog.categories.length).toBeGreaterThanOrEqual(5);
		expect(catalog.items.length).toBeGreaterThan(100);
		const sample = catalog.items.find((i) => i.itemName === 'Basic Materials');
		expect(sample).toMatchObject({
			category: 'resources',
			subcategory: 'bmat',
			categoryIcon: '📦',
		});
		expect(Array.isArray(sample.faction)).toBe(true);
		expect(sample.wikiUrl).toContain('foxhole.wiki.gg');
	});

	it('sets iconUrl when manifest + file exist', () => {
		const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'mat-icons-'));
		const iconsDir = path.join(tmp, 'icons');
		fs.mkdirSync(iconsDir);
		fs.writeFileSync(path.join(iconsDir, 'BasicMaterialsIcon.png'), Buffer.from([1, 2, 3]));
		fs.writeFileSync(
			path.join(iconsDir, 'manifest.json'),
			JSON.stringify({ 'Basic Materials': 'BasicMaterialsIcon.png' }),
		);

		const materialsRoot = path.join(__dirname, '../../data/materials');
		const catalog = listCatalog({ materialsRoot, iconsDir });
		const sample = catalog.items.find((i) => i.itemName === 'Basic Materials');
		expect(sample.iconUrl).toBe(`${PUBLIC_ICON_PREFIX}/BasicMaterialsIcon.png`);
		expect(catalog.icons.with_icon).toBeGreaterThan(0);

		expect(loadManifest(iconsDir)['Basic Materials']).toBe('BasicMaterialsIcon.png');
		expect(resolveIconUrl('Missing', iconsDir, {})).toBeNull();

		fs.rmSync(tmp, { recursive: true, force: true });
	});
});
