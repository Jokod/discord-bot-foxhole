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

	it('loadManifest returns {} for missing or invalid manifest', () => {
		const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'mat-manifest-'));
		expect(loadManifest(tmp)).toEqual({});
		fs.writeFileSync(path.join(tmp, 'manifest.json'), '{not json');
		expect(loadManifest(tmp)).toEqual({});
		fs.rmSync(tmp, { recursive: true, force: true });
	});

	it('skips invalid subcategory JSON files', () => {
		const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'mat-bad-json-'));
		const materialsRoot = path.join(tmp, 'materials');
		const iconsDir = path.join(tmp, 'icons');
		fs.mkdirSync(path.join(materialsRoot, 'resources'), { recursive: true });
		fs.mkdirSync(iconsDir);
		fs.writeFileSync(path.join(materialsRoot, 'resources', 'broken.json'), 'not-json');
		fs.writeFileSync(path.join(materialsRoot, 'resources', 'bmat.json'), 'not-json');
		const catalog = listCatalog({ materialsRoot, iconsDir });
		expect(catalog.items).toEqual([]);
		fs.rmSync(tmp, { recursive: true, force: true });
	});

	it('skips non-array JSON payloads and items without itemName', () => {
		const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'mat-shape-'));
		const materialsRoot = path.join(tmp, 'materials');
		const iconsDir = path.join(tmp, 'icons');
		fs.mkdirSync(path.join(materialsRoot, 'resources'), { recursive: true });
		fs.mkdirSync(iconsDir);
		fs.writeFileSync(path.join(materialsRoot, 'resources', 'bmat.json'), JSON.stringify({ not: 'array' }));
		fs.writeFileSync(
			path.join(materialsRoot, 'resources', 'salvage.json'),
			JSON.stringify([{ itemDesc: 'no name', faction: [] }]),
		);
		const catalog = listCatalog({ materialsRoot, iconsDir });
		expect(catalog.items).toEqual([]);
		fs.rmSync(tmp, { recursive: true, force: true });
	});

	it('resolveIconUrl returns null when manifest file missing on disk', () => {
		const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'mat-icon-miss-'));
		expect(resolveIconUrl('Basic Materials', tmp, { 'Basic Materials': 'Missing.png' })).toBeNull();
		fs.rmSync(tmp, { recursive: true, force: true });
	});

	it('resolveIconUrl ignore manifest entries with unsafe filename', () => {
		const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'mat-icon-unsafe-'));
		const iconsDir = path.join(tmp, 'icons');
		fs.mkdirSync(iconsDir);
		expect(resolveIconUrl('Basic Materials', iconsDir, { 'Basic Materials': '../escape.png' })).toBeNull();
		fs.rmSync(tmp, { recursive: true, force: true });
	});

	it('listCatalog remplit champs optionnels et faction non-tableau', () => {
		const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'mat-fields-'));
		const materialsRoot = path.join(tmp, 'materials');
		const iconsDir = path.join(tmp, 'icons');
		fs.mkdirSync(path.join(materialsRoot, 'resources'), { recursive: true });
		fs.mkdirSync(iconsDir);
		fs.writeFileSync(
			path.join(materialsRoot, 'resources', 'bmat.json'),
			JSON.stringify([{
				itemName: 'Test Item',
				faction: 'warden',
				itemCategory: 'cat',
				damageDesc: 'dmg',
				vehiclePen: 'pen',
				highVelocityBonus: 'hv',
				numberProducedBonus: 'np',
			}]),
		);
		const catalog = listCatalog({ materialsRoot, iconsDir });
		expect(catalog.items[0]).toMatchObject({
			itemName: 'Test Item',
			itemDesc: '',
			faction: [],
			itemCategory: 'cat',
			damageDesc: 'dmg',
		});
		fs.rmSync(tmp, { recursive: true, force: true });
	});

	it('listCatalog utilise subcategories vide si propriété absente', () => {
		const categories = require('../../data/fournis').categories;
		const saved = categories.resources.subcategories;
		delete categories.resources.subcategories;
		try {
			const tmp = require('fs').mkdtempSync(require('path').join(require('os').tmpdir(), 'mat-nosub-'));
			const catalog = listCatalog({
				materialsRoot: require('path').join(tmp, 'materials'),
				iconsDir: require('path').join(tmp, 'icons'),
			});
			const resources = catalog.categories.find((c) => c.id === 'resources');
			expect(resources.subcategories).toEqual([]);
		}
		finally {
			categories.resources.subcategories = saved;
		}
	});

	it('listCatalog utilise icône par défaut si category.icon absent', () => {
		const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'mat-icon-default-'));
		const materialsRoot = path.join(tmp, 'materials');
		const iconsDir = path.join(tmp, 'icons');
		fs.mkdirSync(path.join(materialsRoot, 'resources'), { recursive: true });
		fs.mkdirSync(iconsDir);
		fs.writeFileSync(
			path.join(materialsRoot, 'resources', 'bmat.json'),
			JSON.stringify([{ itemName: 'Only Item', itemDesc: 'x', faction: [] }]),
		);
		const categories = require('../../data/fournis').categories;
		const saved = categories.resources.icon;
		delete categories.resources.icon;
		try {
			const catalog = listCatalog({ materialsRoot, iconsDir });
			expect(catalog.categories.find((c) => c.id === 'resources').icon).toBe('📦');
		}
		finally {
			categories.resources.icon = saved;
		}
		fs.rmSync(tmp, { recursive: true, force: true });
	});
});
