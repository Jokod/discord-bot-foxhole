'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');

const {
	sortMaterialsByName,
	relPathUnderMaterialsRoot,
	loadAllMaterialFiles,
	writeMaterialFile,
	applyCatalogMaintenance,
} = require('../../../scripts/lib/wiki-sync/materials-store');

describe('wiki-sync / materials-store', () => {
	describe('sortMaterialsByName', () => {
		it('trie par itemName (locale en)', () => {
			const a = [{ itemName: 'Zebra' }, { itemName: 'alpha' }, { itemName: 'Beta' }];
			const s = sortMaterialsByName(a);
			expect(s.map(m => m.itemName)).toEqual(['alpha', 'Beta', 'Zebra']);
		});
		it('ne mute pas le tableau d’origine', () => {
			const a = [{ itemName: 'b' }, { itemName: 'a' }];
			sortMaterialsByName(a);
			expect(a[0].itemName).toBe('b');
		});
	});

	describe('relPathUnderMaterialsRoot', () => {
		it('normalise les séparateurs en /', () => {
			const root = '/data/materials';
			const fp = path.join(root, 'ammunition', 'light_ammo.json');
			expect(relPathUnderMaterialsRoot(fp, root)).toBe(
				['ammunition', 'light_ammo.json'].join('/'),
			);
		});
	});

	describe('loadAllMaterialFiles + writeMaterialFile + applyCatalogMaintenance', () => {
		let tmpRoot;
		let materialsRoot;
		let stderrSpy;

		beforeEach(() => {
			tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'foxbot-wiki-sync-'));
			materialsRoot = path.join(tmpRoot, 'materials');
			fs.mkdirSync(path.join(materialsRoot, 'ammunition'), { recursive: true });
			fs.mkdirSync(path.join(materialsRoot, 'utilities'), { recursive: true });
			stderrSpy = jest.spyOn(process.stderr, 'write').mockImplementation(() => undefined);
		});

		afterEach(() => {
			stderrSpy.mockRestore();
			fs.rmSync(tmpRoot, { recursive: true, force: true });
		});

		function writeJson(rel, data) {
			const fp = path.join(materialsRoot, ...rel.split('/'));
			fs.mkdirSync(path.dirname(fp), { recursive: true });
			fs.writeFileSync(fp, `${JSON.stringify(data, null, '\t')}\n`, 'utf8');
		}

		it('loadAllMaterialFiles charge tous les .json par sous-dossier', () => {
			writeJson('ammunition/x.json', [{ itemName: 'A', faction: [], itemDesc: '—', itemCategory: 'x' }]);
			const groups = loadAllMaterialFiles(materialsRoot);
			expect(groups).toHaveLength(1);
			expect(groups[0].materials).toHaveLength(1);
		});

		it('applyCatalogMaintenance (!dryRun) supprime les itemName dans PRUNE_CATALOG', () => {
			writeJson('ammunition/misc_ammo.json', [
				{ itemName: 'AP/RPG', faction: ['warden'], itemDesc: 'x', itemCategory: 'heavy_arms' },
				{ itemName: 'Keep Me', faction: ['colonial'], itemDesc: 'y', itemCategory: 'heavy_arms' },
			]);
			const groups = loadAllMaterialFiles(materialsRoot);
			applyCatalogMaintenance(groups, materialsRoot, false);
			const raw = JSON.parse(fs.readFileSync(path.join(materialsRoot, 'ammunition', 'misc_ammo.json'), 'utf8'));
			expect(raw.map(m => m.itemName)).toEqual(['Keep Me']);
		});

		it('applyCatalogMaintenance (!dryRun) rehome Molten Wind ammo vers flamethrower_ammo.json', () => {
			const molten = '\u201cMolten Wind\u201d v.II Ammo';
			writeJson('utilities/field_equipment.json', [
				{ itemName: molten, faction: ['colonial'], itemDesc: 'ammo', itemCategory: 'utilities' },
			]);
			writeJson('ammunition/flamethrower_ammo.json', [
				{ itemName: 'Willow\'s Bane Ammo', faction: ['warden'], itemDesc: 'w', itemCategory: 'heavy_arms' },
			]);
			const groups = loadAllMaterialFiles(materialsRoot);
			applyCatalogMaintenance(groups, materialsRoot, false);
			const field = JSON.parse(fs.readFileSync(path.join(materialsRoot, 'utilities', 'field_equipment.json'), 'utf8'));
			const flame = JSON.parse(fs.readFileSync(path.join(materialsRoot, 'ammunition', 'flamethrower_ammo.json'), 'utf8'));
			expect(field.some(m => m.itemName === molten)).toBe(false);
			expect(flame.some(m => m.itemName === molten)).toBe(true);
		});

		it('writeMaterialFile trie et écrit le JSON', () => {
			const fp = path.join(materialsRoot, 'ammunition', 't.json');
			const list = [{ itemName: 'b', faction: [], itemDesc: '—', itemCategory: 'x' }, { itemName: 'a', faction: [], itemDesc: '—', itemCategory: 'x' }];
			writeMaterialFile(fp, list);
			const out = JSON.parse(fs.readFileSync(fp, 'utf8'));
			expect(out.map(m => m.itemName)).toEqual(['a', 'b']);
		});
	});
});
