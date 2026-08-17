'use strict';

jest.mock('../../../scripts/lib/wiki-sync/config', () => ({
	BATCH_SIZE: 2,
	BATCH_DELAY_MS: 0,
	WIKI_HUB_TITLES: new Set(['Hub']),
	WIKI_SCAN_CATEGORIES: ['CatA', 'CatB'],
	WIKI_EXTRA_SCAN_TITLES: [],
	WIKI_NOT_LOGISTICS_TITLES: new Set(['NotLogi']),
	WIKI_COVERED_BY_CATALOG_HUBS: new Set(['CoveredHub']),
}));

jest.mock('../../../scripts/lib/wiki-sync/wiki-helpers', () => ({
	sleep: jest.fn(async () => undefined),
	isFrenchUniformEntry: jest.fn((m) => m.itemName === 'FR Uniform'),
	inferWikiTitle: jest.fn((name) => name),
	wikiFactionToArray: jest.fn((raw) => {
		if (raw === 'Colonial') return ['colonial'];
		if (raw === 'Both') return ['colonial', 'warden'];
		return null;
	}),
	canonicalInfoboxNameForCatalog: jest.fn((name) => name || null),
}));

jest.mock('../../../scripts/lib/wiki-sync/wiki-content', () => ({
	extractFirstInfoboxFaction: jest.fn(() => 'Colonial'),
	descriptionFromWikitext: jest.fn(() => 'A description'),
	parseItemOrVehicleInfobox: jest.fn(),
}));

jest.mock('../../../scripts/lib/wiki-sync/wiki-route', () => ({
	routeWikiInfoboxToMaterialFile: jest.fn(),
}));

jest.mock('../../../scripts/lib/wiki-sync/wiki-client', () => ({
	fetchCategoryPageTitles: jest.fn(),
	fetchWikitextForTitles: jest.fn(),
}));

jest.mock('../../../scripts/lib/wiki-sync/materials-store', () => ({
	loadAllMaterialFiles: jest.fn(async (root) => [{ reloaded: true, root }]),
	writeMaterialFile: jest.fn((_fp, materials) => [...materials].sort((a, b) => a.itemName.localeCompare(b.itemName))),
}));

const path = require('path');
const { sleep } = require('../../../scripts/lib/wiki-sync/wiki-helpers');
const {
	extractFirstInfoboxFaction,
	descriptionFromWikitext,
	parseItemOrVehicleInfobox,
} = require('../../../scripts/lib/wiki-sync/wiki-content');
const { routeWikiInfoboxToMaterialFile } = require('../../../scripts/lib/wiki-sync/wiki-route');
const {
	fetchCategoryPageTitles,
	fetchWikitextForTitles,
} = require('../../../scripts/lib/wiki-sync/wiki-client');
const { loadAllMaterialFiles, writeMaterialFile } = require('../../../scripts/lib/wiki-sync/materials-store');
const { runAddMissing, flushModifiedMaterialFiles } = require('../../../scripts/lib/wiki-sync/add-missing');

describe('wiki-sync / add-missing', () => {
	const materialsRoot = '/tmp/materials';
	const fp = path.join(materialsRoot, 'resources', 'bmat.json');

	beforeEach(() => {
		jest.clearAllMocks();
		fetchCategoryPageTitles
			.mockResolvedValueOnce(['Existing Item', 'New Item', 'Hub', 'NotLogi', 'path/sub'])
			.mockResolvedValueOnce(['New Item', 'Unrouted', 'Redirect', 'NoWt', 'NoBox', 'Dup Name']);
		fetchWikitextForTitles.mockImplementation(async (batch) => {
			const map = new Map();
			for (const t of batch) {
				if (t === 'NoWt') continue;
				if (t === 'Redirect') map.set(t, '#REDIRECT [[Elsewhere]]');
				else if (t === 'NoBox') map.set(t, 'plain text');
				else map.set(t, `{{Item Infobox|name=${t}}}`);
			}
			return map;
		});
		parseItemOrVehicleInfobox.mockImplementation((wt) => {
			if (wt.startsWith('#REDIRECT') || wt === 'plain text') return null;
			const name = wt.match(/name=([^}]+)/)?.[1] || 'X';
			return {
				fields: {
					name,
					category: 'Resource',
					type: 'Raw',
					ItemProfileType: 'Item',
				},
			};
		});
		routeWikiInfoboxToMaterialFile.mockImplementation((parsed) => {
			if (parsed.fields.name === 'Unrouted') return null;
			return { relPath: 'resources/bmat.json', itemCategory: 'resources' };
		});
		extractFirstInfoboxFaction.mockReturnValue('Colonial');
		descriptionFromWikitext.mockReturnValue('A description');
	});

	it('filtre candidats, ajoute en dry-run et ne écrit pas', async () => {
		const fileGroups = [{
			filePath: fp,
			materials: [{ itemName: 'Existing Item', itemDesc: 'old' }],
		}];
		const stderr = jest.spyOn(process.stderr, 'write').mockImplementation(() => true);
		const stdout = jest.spyOn(process.stdout, 'write').mockImplementation(() => true);

		const out = await runAddMissing(true, materialsRoot, fileGroups);

		expect(out).toBe(fileGroups);
		expect(writeMaterialFile).not.toHaveBeenCalled();
		expect(loadAllMaterialFiles).not.toHaveBeenCalled();
		expect(stdout).toHaveBeenCalledWith(expect.stringContaining('[add] resources/bmat.json ← New Item'));
		expect(stderr).toHaveBeenCalledWith(expect.stringContaining('[--dry-run]'));
		expect(sleep).toHaveBeenCalled();

		stderr.mockRestore();
		stdout.mockRestore();
	});

	it('écrit les fichiers hors dry-run et recharge', async () => {
		const materials = [{ itemName: 'Existing Item', itemDesc: 'old' }];
		const fileGroups = [{ filePath: fp, materials }];
		const stderr = jest.spyOn(process.stderr, 'write').mockImplementation(() => true);

		const out = await runAddMissing(false, materialsRoot, fileGroups);

		expect(writeMaterialFile).toHaveBeenCalled();
		expect(materials.some((m) => m.itemName === 'New Item')).toBe(true);
		expect(out).toEqual([{ reloaded: true, root: materialsRoot }]);
		expect(loadAllMaterialFiles).toHaveBeenCalledWith(materialsRoot);

		stderr.mockRestore();
	});

	it('compte skips et non routés', async () => {
		const fileGroups = [{
			filePath: fp,
			materials: [
				{ itemName: 'Existing Item' },
				{ itemName: 'Dup Name' },
			],
		}];
		const stderr = jest.spyOn(process.stderr, 'write').mockImplementation(() => true);

		await runAddMissing(true, materialsRoot, fileGroups);

		const joined = stderr.mock.calls.map((c) => c[0]).join('');
		expect(joined).toMatch(/sans wikitext|redirection|sans infobox|non mappée/);
		expect(joined).toContain('Non routés');

		stderr.mockRestore();
	});

	it('ignore un relPath inconnu dans le catalogue local', async () => {
		routeWikiInfoboxToMaterialFile.mockReturnValue({
			relPath: 'missing/path.json',
			itemCategory: 'resources',
		});
		fetchCategoryPageTitles
			.mockReset()
			.mockResolvedValueOnce(['Only New'])
			.mockResolvedValueOnce([]);
		fetchWikitextForTitles.mockResolvedValue(new Map([
			['Only New', '{{Item Infobox|name=Only New}}'],
		]));
		parseItemOrVehicleInfobox.mockReturnValue({
			fields: { name: 'Only New', category: 'x', type: 'y', ItemProfileType: 'z' },
		});
		const fileGroups = [{ filePath: fp, materials: [] }];
		const stderr = jest.spyOn(process.stderr, 'write').mockImplementation(() => true);

		await runAddMissing(true, materialsRoot, fileGroups);
		expect(stderr).toHaveBeenCalledWith(expect.stringContaining('Chemin inconnu'));

		stderr.mockRestore();
	});

	it('utilise faction Both par défaut si extraction null', async () => {
		extractFirstInfoboxFaction.mockReturnValue(null);
		const { wikiFactionToArray } = require('../../../scripts/lib/wiki-sync/wiki-helpers');
		wikiFactionToArray.mockReturnValue(null);
		fetchCategoryPageTitles
			.mockReset()
			.mockResolvedValueOnce(['Solo'])
			.mockResolvedValueOnce([]);
		fetchWikitextForTitles.mockResolvedValue(new Map([
			['Solo', '{{Item Infobox|name=Solo}}'],
		]));
		parseItemOrVehicleInfobox.mockReturnValue({
			fields: { name: 'Solo', category: 'x', type: 'y', ItemProfileType: 'z' },
		});
		routeWikiInfoboxToMaterialFile.mockReturnValue({
			relPath: 'resources/bmat.json',
			itemCategory: 'resources',
		});
		const materials = [];
		const fileGroups = [{ filePath: fp, materials }];
		const stderr = jest.spyOn(process.stderr, 'write').mockImplementation(() => true);

		await runAddMissing(false, materialsRoot, fileGroups);
		expect(materials[0].faction).toEqual(['colonial', 'warden']);

		stderr.mockRestore();
	});

	it('ignore les uniforms FR pour knownWikiTitles et message aucune entrée', async () => {
		const { isFrenchUniformEntry, inferWikiTitle } = require('../../../scripts/lib/wiki-sync/wiki-helpers');
		isFrenchUniformEntry.mockImplementation((m) => m.itemName === 'FR Uniform');
		inferWikiTitle.mockImplementation((name) => name);
		fetchCategoryPageTitles
			.mockReset()
			.mockResolvedValueOnce(['FR Uniform'])
			.mockResolvedValueOnce([]);
		fetchWikitextForTitles.mockResolvedValue(new Map());
		const fileGroups = [{
			filePath: fp,
			materials: [{ itemName: 'FR Uniform', itemDesc: 'fr' }],
		}];
		const stderr = jest.spyOn(process.stderr, 'write').mockImplementation(() => true);

		await runAddMissing(true, materialsRoot, fileGroups);
		const joined = stderr.mock.calls.map((c) => c[0]).join('');
		// FR Uniform is a wiki candidate (not in knownWikiTitles) but no wikitext → 0 adds
		expect(joined).toContain('Aucune nouvelle entrée');

		stderr.mockRestore();
	});

	it('filtre knownWikiTitles et fallback desc —', async () => {
		const { inferWikiTitle } = require('../../../scripts/lib/wiki-sync/wiki-helpers');
		inferWikiTitle.mockImplementation((name) => (name === 'Local Name' ? 'Wiki Title' : name));
		descriptionFromWikitext.mockReturnValue(null);
		fetchCategoryPageTitles
			.mockReset()
			.mockResolvedValueOnce(['Wiki Title', 'Fresh'])
			.mockResolvedValueOnce([]);
		fetchWikitextForTitles.mockResolvedValue(new Map([
			['Fresh', '{{Item Infobox|name=Fresh}}'],
		]));
		parseItemOrVehicleInfobox.mockReturnValue({
			fields: { name: 'Fresh', category: 'x', type: 'y', ItemProfileType: 'z' },
		});
		routeWikiInfoboxToMaterialFile.mockReturnValue({
			relPath: 'resources/bmat.json',
			itemCategory: 'resources',
		});
		const materials = [{ itemName: 'Local Name', itemDesc: 'old' }];
		const fileGroups = [{ filePath: fp, materials }];
		const stderr = jest.spyOn(process.stderr, 'write').mockImplementation(() => true);

		await runAddMissing(false, materialsRoot, fileGroups);
		const added = materials.find((m) => m.itemName === 'Fresh');
		expect(added.itemDesc).toBe('—');
		expect(materials.some((m) => m.itemName === 'Wiki Title')).toBe(false);

		stderr.mockRestore();
	});

	it('unrouted si displayName vide + liste > 25 exemples', async () => {
		const { canonicalInfoboxNameForCatalog } = require('../../../scripts/lib/wiki-sync/wiki-helpers');
		canonicalInfoboxNameForCatalog.mockReturnValue(null);
		const titles = Array.from({ length: 26 }, (_, i) => `U${i}`);
		fetchCategoryPageTitles
			.mockReset()
			.mockResolvedValueOnce(titles)
			.mockResolvedValueOnce([]);
		fetchWikitextForTitles.mockImplementation(async (batch) => {
			const map = new Map();
			for (const t of batch) map.set(t, `{{Item Infobox|name=${t}}}`);
			return map;
		});
		parseItemOrVehicleInfobox.mockImplementation((wt) => {
			const name = wt.match(/name=([^}]+)/)[1];
			return {
				fields: { name, category: 'c', type: 't', ItemProfileType: 'p' },
			};
		});
		routeWikiInfoboxToMaterialFile.mockReturnValue({
			relPath: 'resources/bmat.json',
			itemCategory: 'resources',
		});
		const fileGroups = [{ filePath: fp, materials: [] }];
		const stderr = jest.spyOn(process.stderr, 'write').mockImplementation(() => true);

		await runAddMissing(true, materialsRoot, fileGroups);
		const joined = stderr.mock.calls.map((c) => c[0]).join('');
		expect(joined).toContain('de plus');
		expect(joined).toContain('infobox non mappée');

		stderr.mockRestore();
	});

	it('skipDupInfoboxName quand le nom d’infobox est déjà en catalogue', async () => {
		fetchCategoryPageTitles
			.mockReset()
			.mockResolvedValueOnce(['Wiki Alias'])
			.mockResolvedValueOnce([]);
		fetchWikitextForTitles.mockResolvedValue(new Map([
			['Wiki Alias', '{{Item Infobox|name=Catalog Name}}'],
		]));
		parseItemOrVehicleInfobox.mockReturnValue({
			fields: {
				name: 'Catalog Name',
				category: 'x',
				type: 'y',
				ItemProfileType: 'z',
			},
		});
		routeWikiInfoboxToMaterialFile.mockReturnValue({
			relPath: 'resources/bmat.json',
			itemCategory: 'resources',
		});
		const { canonicalInfoboxNameForCatalog } = require('../../../scripts/lib/wiki-sync/wiki-helpers');
		canonicalInfoboxNameForCatalog.mockReturnValue('Catalog Name');
		const fileGroups = [{
			filePath: fp,
			materials: [{ itemName: 'Catalog Name', itemDesc: 'already' }],
		}];
		const stderr = jest.spyOn(process.stderr, 'write').mockImplementation(() => true);

		await runAddMissing(true, materialsRoot, fileGroups);
		const joined = stderr.mock.calls.map((c) => c[0]).join('');
		expect(joined).toContain('nom d’infobox déjà en catalogue');
		expect(joined).toContain('Aucune nouvelle entrée');

		stderr.mockRestore();
	});

	it('sleep entre lots de candidats', async () => {
		fetchCategoryPageTitles
			.mockReset()
			.mockResolvedValueOnce(['A', 'B', 'C'])
			.mockResolvedValueOnce([]);
		fetchWikitextForTitles.mockImplementation(async (batch) => {
			const map = new Map();
			for (const t of batch) map.set(t, `{{Item Infobox|name=${t}}}`);
			return map;
		});
		parseItemOrVehicleInfobox.mockImplementation((wt) => {
			const name = wt.match(/name=([^}]+)/)[1];
			return { fields: { name, category: 'c', type: 't', ItemProfileType: 'p' } };
		});
		routeWikiInfoboxToMaterialFile.mockReturnValue({
			relPath: 'resources/bmat.json',
			itemCategory: 'resources',
		});
		const fileGroups = [{ filePath: fp, materials: [] }];
		const stderr = jest.spyOn(process.stderr, 'write').mockImplementation(() => true);
		const stdout = jest.spyOn(process.stdout, 'write').mockImplementation(() => true);

		await runAddMissing(true, materialsRoot, fileGroups);
		expect(sleep.mock.calls.length).toBeGreaterThanOrEqual(2);

		stderr.mockRestore();
		stdout.mockRestore();
	});

	it('ignore si le groupe disparaît du fileGroups (défense)', async () => {
		const fileGroups = [{ filePath: fp, materials: [] }];
		fetchCategoryPageTitles
			.mockReset()
			.mockResolvedValueOnce(['Ghost'])
			.mockResolvedValueOnce([]);
		fetchWikitextForTitles.mockImplementation(async (batch) => {
			// Simule un fileGroups vidé après indexation initiale
			fileGroups.length = 0;
			const map = new Map();
			for (const t of batch) map.set(t, `{{Item Infobox|name=${t}}}`);
			return map;
		});
		parseItemOrVehicleInfobox.mockReturnValue({
			fields: { name: 'Ghost', category: 'c', type: 't', ItemProfileType: 'p' },
		});
		routeWikiInfoboxToMaterialFile.mockReturnValue({
			relPath: 'resources/bmat.json',
			itemCategory: 'resources',
		});
		const { canonicalInfoboxNameForCatalog } = require('../../../scripts/lib/wiki-sync/wiki-helpers');
		canonicalInfoboxNameForCatalog.mockReturnValue('Ghost');
		const stderr = jest.spyOn(process.stderr, 'write').mockImplementation(() => true);
		const stdout = jest.spyOn(process.stdout, 'write').mockImplementation(() => true);

		await runAddMissing(true, materialsRoot, fileGroups);
		expect(stdout).not.toHaveBeenCalledWith(expect.stringContaining('[add]'));

		stderr.mockRestore();
		stdout.mockRestore();
	});

	it('filtre WIKI_NOT_LOGISTICS_TITLES et REDIRECT avec espaces', async () => {
		fetchCategoryPageTitles
			.mockReset()
			.mockResolvedValueOnce(['NotLogi', ' Spaced Redirect '])
			.mockResolvedValueOnce([]);
		fetchWikitextForTitles.mockResolvedValue(new Map([
			[' Spaced Redirect ', '  #REDIRECT [[Elsewhere]]'],
		]));
		const fileGroups = [{ filePath: fp, materials: [] }];
		const stderr = jest.spyOn(process.stderr, 'write').mockImplementation(() => true);

		await runAddMissing(true, materialsRoot, fileGroups);
		const joined = stderr.mock.calls.map((c) => c[0]).join('');
		expect(joined).toContain('redirection');
		expect(joined).toContain('Aucune nouvelle entrée');

		stderr.mockRestore();
	});

	it('unrouted si name absent dans infobox', async () => {
		fetchCategoryPageTitles.mockReset().mockResolvedValueOnce(['NoNameField']).mockResolvedValueOnce([]);
		fetchWikitextForTitles.mockResolvedValue(new Map([
			['NoNameField', '{{Item Infobox|category=X|type=T|ItemProfileType=P}}'],
		]));
		parseItemOrVehicleInfobox.mockReturnValue({
			fields: { category: 'X', type: 'T', ItemProfileType: 'P' },
		});
		routeWikiInfoboxToMaterialFile.mockReturnValue({
			relPath: 'resources/bmat.json',
			itemCategory: 'resources',
		});
		const { canonicalInfoboxNameForCatalog } = require('../../../scripts/lib/wiki-sync/wiki-helpers');
		canonicalInfoboxNameForCatalog.mockReturnValue('');
		const fileGroups = [{ filePath: fp, materials: [] }];
		const stderr = jest.spyOn(process.stderr, 'write').mockImplementation(() => true);
		await runAddMissing(true, materialsRoot, fileGroups);
		expect(stderr.mock.calls.map((c) => c[0]).join('')).toContain('infobox non mappée');
		stderr.mockRestore();
	});

	it('unrouted si route null avec displayName valide', async () => {
		fetchCategoryPageTitles.mockReset().mockResolvedValueOnce(['BadRoute']).mockResolvedValueOnce([]);
		fetchWikitextForTitles.mockResolvedValue(new Map([
			['BadRoute', '{{Item Infobox|name=BadRoute|category=X|type=T|ItemProfileType=P}}'],
		]));
		parseItemOrVehicleInfobox.mockReturnValue({
			fields: { name: 'BadRoute', category: 'X', type: 'T', ItemProfileType: 'P' },
		});
		routeWikiInfoboxToMaterialFile.mockReturnValue(null);
		const { canonicalInfoboxNameForCatalog } = require('../../../scripts/lib/wiki-sync/wiki-helpers');
		canonicalInfoboxNameForCatalog.mockReturnValue('BadRoute');
		const fileGroups = [{ filePath: fp, materials: [] }];
		const stderr = jest.spyOn(process.stderr, 'write').mockImplementation(() => true);
		await runAddMissing(true, materialsRoot, fileGroups);
		expect(stderr.mock.calls.map((c) => c[0]).join('')).toContain('infobox non mappée');
		stderr.mockRestore();
	});

	it('skip entrée sans displayName après route', async () => {
		fetchCategoryPageTitles.mockReset().mockResolvedValueOnce(['NoName']).mockResolvedValueOnce([]);
		fetchWikitextForTitles.mockResolvedValue(new Map([
			['NoName', '{{Item Infobox|name=|category=X|type=T|ItemProfileType=P}}'],
		]));
		parseItemOrVehicleInfobox.mockReturnValue({
			fields: { name: '   ', category: 'X', type: 'T', ItemProfileType: 'P' },
		});
		routeWikiInfoboxToMaterialFile.mockReturnValue({
			relPath: 'resources/bmat.json',
			itemCategory: 'resources',
		});
		const { canonicalInfoboxNameForCatalog } = require('../../../scripts/lib/wiki-sync/wiki-helpers');
		canonicalInfoboxNameForCatalog.mockReturnValue('');
		const fileGroups = [{ filePath: fp, materials: [] }];
		const stderr = jest.spyOn(process.stderr, 'write').mockImplementation(() => true);
		await runAddMissing(true, materialsRoot, fileGroups);
		expect(stderr.mock.calls.map((c) => c[0]).join('')).toContain('Aucune nouvelle entrée');
		stderr.mockRestore();
	});

	it('écrit les fichiers modifiés en dryRun false', async () => {
		fetchCategoryPageTitles.mockReset().mockResolvedValueOnce(['NewItem']).mockResolvedValueOnce([]);
		fetchWikitextForTitles.mockResolvedValue(new Map([
			['NewItem', '{{Item Infobox|name=NewItem|category=X|type=T|ItemProfileType=P}}'],
		]));
		parseItemOrVehicleInfobox.mockReturnValue({
			fields: { name: 'NewItem', category: 'X', type: 'T', ItemProfileType: 'P' },
		});
		routeWikiInfoboxToMaterialFile.mockReturnValue({
			relPath: 'resources/bmat.json',
			itemCategory: 'resources',
		});
		const { canonicalInfoboxNameForCatalog } = require('../../../scripts/lib/wiki-sync/wiki-helpers');
		canonicalInfoboxNameForCatalog.mockReturnValue('NewItem');
		const fileGroups = [{ filePath: fp, materials: [] }];
		const stderr = jest.spyOn(process.stderr, 'write').mockImplementation(() => true);
		const stdout = jest.spyOn(process.stdout, 'write').mockImplementation(() => true);
		await runAddMissing(false, materialsRoot, fileGroups);
		expect(writeMaterialFile).toHaveBeenCalledWith(fp, expect.arrayContaining([
			expect.objectContaining({ itemName: 'NewItem' }),
		]));
		stderr.mockRestore();
		stdout.mockRestore();
	});

	it('flushModifiedMaterialFiles ignore un path sans groupe', () => {
		writeMaterialFile.mockClear();
		flushModifiedMaterialFiles(['/missing.json'], [{ filePath: fp, materials: [] }]);
		expect(writeMaterialFile).not.toHaveBeenCalled();
	});

	it('flushModifiedMaterialFiles écrit un groupe trouvé', () => {
		writeMaterialFile.mockClear().mockReturnValue([{ itemName: 'Sorted' }]);
		const group = { filePath: fp, materials: [{ itemName: 'A' }] };
		flushModifiedMaterialFiles([fp], [group]);
		expect(writeMaterialFile).toHaveBeenCalledWith(fp, expect.any(Array));
		expect(group.materials).toEqual([{ itemName: 'Sorted' }]);
	});
});
