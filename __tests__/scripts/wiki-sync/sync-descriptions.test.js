'use strict';

jest.mock('../../../scripts/lib/wiki-sync/config', () => ({
	BATCH_SIZE: 2,
	BATCH_DELAY_MS: 0,
}));

jest.mock('../../../scripts/lib/wiki-sync/wiki-helpers', () => ({
	sleep: jest.fn(async () => undefined),
	isFrenchUniformEntry: jest.fn((m) => m.itemName === 'FR Uniform'),
	inferWikiTitle: jest.fn((name) => name),
	wikiFactionToArray: jest.fn((raw) => {
		if (!raw) return null;
		if (raw === 'Warden') return ['warden'];
		return ['colonial', 'warden'];
	}),
}));

jest.mock('../../../scripts/lib/wiki-sync/wiki-content', () => ({
	extractFirstInfoboxFaction: jest.fn(),
	descriptionFromWikitext: jest.fn(),
}));

jest.mock('../../../scripts/lib/wiki-sync/wiki-client', () => ({
	fetchWikitextForTitles: jest.fn(),
}));

jest.mock('../../../scripts/lib/wiki-sync/materials-store', () => ({
	writeMaterialFile: jest.fn((_fp, materials) => [...materials]),
}));

const { sleep, inferWikiTitle } = require('../../../scripts/lib/wiki-sync/wiki-helpers');
const {
	extractFirstInfoboxFaction,
	descriptionFromWikitext,
} = require('../../../scripts/lib/wiki-sync/wiki-content');
const { fetchWikitextForTitles } = require('../../../scripts/lib/wiki-sync/wiki-client');
const { writeMaterialFile } = require('../../../scripts/lib/wiki-sync/materials-store');
const { runSyncDescriptionsAndFactions } = require('../../../scripts/lib/wiki-sync/sync-descriptions');

describe('wiki-sync / sync-descriptions', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		inferWikiTitle.mockImplementation((name) => name);
	});

	it('met à jour desc + faction et écrit le fichier', async () => {
		const materials = [
			{ itemName: 'Bmats', itemDesc: 'old', faction: ['colonial'] },
			{ itemName: 'FR Uniform', itemDesc: 'fr', faction: ['warden'] },
		];
		const fileGroups = [{ filePath: '/tmp/bmat.json', materials }];
		fetchWikitextForTitles.mockResolvedValue(new Map([
			['Bmats', '{{Item Infobox}}'],
		]));
		descriptionFromWikitext.mockReturnValue('new desc');
		extractFirstInfoboxFaction.mockReturnValue('Warden');

		const stderr = jest.spyOn(process.stderr, 'write').mockImplementation(() => true);
		await runSyncDescriptionsAndFactions(fileGroups, { dryRun: false, descOnly: false });
		stderr.mockRestore();

		expect(materials[0].itemDesc).toBe('new desc');
		expect(materials[0].faction).toEqual(['warden']);
		expect(materials[1].itemDesc).toBe('fr');
		expect(writeMaterialFile).toHaveBeenCalledWith('/tmp/bmat.json', materials);
		expect(sleep).not.toHaveBeenCalled();
	});

	it('dry-run affiche sans écrire ; descOnly saute les factions', async () => {
		const materials = [
			{ itemName: 'Bmats', itemDesc: 'old', faction: ['colonial'] },
		];
		const fileGroups = [{ filePath: '/tmp/bmat.json', materials }];
		fetchWikitextForTitles.mockResolvedValue(new Map([
			['Bmats', '{{Item Infobox}}'],
		]));
		descriptionFromWikitext.mockReturnValue('new desc');
		extractFirstInfoboxFaction.mockReturnValue('Warden');

		const stdout = jest.spyOn(process.stdout, 'write').mockImplementation(() => true);
		const stderr = jest.spyOn(process.stderr, 'write').mockImplementation(() => true);

		await runSyncDescriptionsAndFactions(fileGroups, { dryRun: true, descOnly: true });

		expect(stdout).toHaveBeenCalledWith(expect.stringContaining('[desc] Bmats'));
		expect(writeMaterialFile).not.toHaveBeenCalled();
		expect(materials[0].faction).toEqual(['colonial']);

		stdout.mockRestore();
		stderr.mockRestore();
	});

	it('liste missing sans troncature si <= 40', async () => {
		const materials = Array.from({ length: 10 }, (_, i) => ({
			itemName: `M${i}`,
			itemDesc: 'x',
			faction: ['warden'],
		}));
		const fileGroups = [{ filePath: '/tmp/a.json', materials }];
		fetchWikitextForTitles.mockResolvedValue(new Map());
		const stderr = jest.spyOn(process.stderr, 'write').mockImplementation(() => true);
		await runSyncDescriptionsAndFactions(fileGroups, { dryRun: false, descOnly: false });
		const joined = stderr.mock.calls.map((c) => c[0]).join('');
		expect(joined).toContain('Pages wiki introuvables');
		expect(joined).not.toContain('et ');
		stderr.mockRestore();
	});

	it('liste les pages manquantes et skip desc vide', async () => {
		const materials = [
			{ itemName: 'Missing', itemDesc: 'x', faction: ['warden'] },
			{ itemName: 'EmptyDesc', itemDesc: 'keep', faction: ['warden'] },
		];
		const manyMissing = Array.from({ length: 42 }, (_, i) => ({
			itemName: `M${i}`,
			itemDesc: 'x',
			faction: ['warden'],
		}));
		const fileGroups = [{
			filePath: '/tmp/a.json',
			materials: [...materials, ...manyMissing],
		}];
		fetchWikitextForTitles.mockImplementation(async (batch) => {
			const map = new Map();
			for (const t of batch) {
				if (t === 'EmptyDesc') {
					map.set(t, '{{Item Infobox}}');
				}
			}
			return map;
		});
		descriptionFromWikitext.mockReturnValue(null);
		extractFirstInfoboxFaction.mockReturnValue(null);

		const stderr = jest.spyOn(process.stderr, 'write').mockImplementation(() => true);
		await runSyncDescriptionsAndFactions(fileGroups, { dryRun: false, descOnly: false });
		const joined = stderr.mock.calls.map((c) => c[0]).join('');
		expect(joined).toContain('Pages wiki introuvables');
		expect(joined).toContain('et 3 autres');
		stderr.mockRestore();
	});

	it('regroupe plusieurs itemNames sur même wikiTitle', async () => {
		inferWikiTitle.mockImplementation(() => 'SameWiki');
		const materials = [
			{ itemName: 'Item A', itemDesc: 'a', faction: ['warden'] },
			{ itemName: 'Item B', itemDesc: 'b', faction: ['warden'] },
		];
		fetchWikitextForTitles.mockResolvedValue(new Map([['SameWiki', '{{Item Infobox}}']]));
		descriptionFromWikitext.mockReturnValue('desc');
		extractFirstInfoboxFaction.mockReturnValue('Both');
		const stderr = jest.spyOn(process.stderr, 'write').mockImplementation(() => true);
		await runSyncDescriptionsAndFactions(
			[{ filePath: '/tmp/x.json', materials }],
			{ dryRun: false, descOnly: false },
		);
		expect(materials[0].itemDesc).toBe('desc');
		expect(materials[1].itemDesc).toBe('desc');
		stderr.mockRestore();
	});

	it('batch avec sleep entre lots', async () => {
		const materials = [
			{ itemName: 'A', itemDesc: '1', faction: ['warden'] },
			{ itemName: 'B', itemDesc: '2', faction: ['warden'] },
			{ itemName: 'C', itemDesc: '3', faction: ['warden'] },
		];
		fetchWikitextForTitles.mockResolvedValue(new Map([
			['A', 'wt'], ['B', 'wt'], ['C', 'wt'],
		]));
		descriptionFromWikitext.mockReturnValue(null);
		extractFirstInfoboxFaction.mockReturnValue(null);
		const stderr = jest.spyOn(process.stderr, 'write').mockImplementation(() => true);

		await runSyncDescriptionsAndFactions(
			[{ filePath: '/tmp/x.json', materials }],
			{ dryRun: false, descOnly: true },
		);

		expect(fetchWikitextForTitles).toHaveBeenCalledTimes(2);
		expect(sleep).toHaveBeenCalled();
		stderr.mockRestore();
	});

	it('dry-run faction sans changer le fichier', async () => {
		const materials = [
			{ itemName: 'Bmats', itemDesc: 'same', faction: ['colonial'] },
		];
		fetchWikitextForTitles.mockResolvedValue(new Map([['Bmats', 'wt']]));
		descriptionFromWikitext.mockReturnValue('same');
		extractFirstInfoboxFaction.mockReturnValue('Warden');
		const stdout = jest.spyOn(process.stdout, 'write').mockImplementation(() => true);
		const stderr = jest.spyOn(process.stderr, 'write').mockImplementation(() => true);

		await runSyncDescriptionsAndFactions(
			[{ filePath: '/tmp/x.json', materials }],
			{ dryRun: true, descOnly: false },
		);

		expect(stdout).toHaveBeenCalledWith(expect.stringContaining('[faction] Bmats'));
		expect(writeMaterialFile).not.toHaveBeenCalled();
		stdout.mockRestore();
		stderr.mockRestore();
	});

	it('dry-run affiche desc tronquée pour textes longs', async () => {
		const materials = [
			{ itemName: 'Bmats', itemDesc: 'o'.repeat(120), faction: ['colonial'] },
		];
		fetchWikitextForTitles.mockResolvedValue(new Map([['Bmats', 'wt']]));
		descriptionFromWikitext.mockReturnValue('n'.repeat(120));
		extractFirstInfoboxFaction.mockReturnValue(null);
		const stdout = jest.spyOn(process.stdout, 'write').mockImplementation(() => true);
		const stderr = jest.spyOn(process.stderr, 'write').mockImplementation(() => true);

		await runSyncDescriptionsAndFactions(
			[{ filePath: '/tmp/x.json', materials }],
			{ dryRun: true, descOnly: true },
		);

		expect(stdout).toHaveBeenCalledWith(expect.stringContaining('[desc] Bmats'));
		stdout.mockRestore();
		stderr.mockRestore();
	});

	it('n’écrit pas si desc et faction inchangées', async () => {
		const materials = [
			{ itemName: 'Bmats', itemDesc: 'same', faction: ['warden'] },
		];
		fetchWikitextForTitles.mockResolvedValue(new Map([['Bmats', 'wt']]));
		descriptionFromWikitext.mockReturnValue('same');
		extractFirstInfoboxFaction.mockReturnValue('Warden');
		const stderr = jest.spyOn(process.stderr, 'write').mockImplementation(() => true);

		await runSyncDescriptionsAndFactions(
			[{ filePath: '/tmp/x.json', materials }],
			{ dryRun: false, descOnly: false },
		);

		expect(writeMaterialFile).not.toHaveBeenCalled();
		stderr.mockRestore();
	});

	it('ignore les uniforms FR lors de l’indexation wiki', async () => {
		const materials = [
			{ itemName: 'FR Uniform', itemDesc: 'fr', faction: ['warden'] },
			{ itemName: 'Bmats', itemDesc: 'old', faction: ['colonial'] },
		];
		fetchWikitextForTitles.mockResolvedValue(new Map([['Bmats', 'wt']]));
		descriptionFromWikitext.mockReturnValue('new desc');
		extractFirstInfoboxFaction.mockReturnValue(null);
		const stderr = jest.spyOn(process.stderr, 'write').mockImplementation(() => true);

		await runSyncDescriptionsAndFactions(
			[{ filePath: '/tmp/x.json', materials }],
			{ dryRun: false, descOnly: false },
		);

		expect(fetchWikitextForTitles).toHaveBeenCalledWith(['Bmats']);
		expect(materials[0].itemDesc).toBe('fr');
		expect(materials[1].itemDesc).toBe('new desc');
		stderr.mockRestore();
	});
});
