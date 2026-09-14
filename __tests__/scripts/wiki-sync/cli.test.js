'use strict';

jest.mock('../../../scripts/lib/wiki-sync/core/pipeline', () => ({
	runWikiSync: jest.fn(async () => ({ phases: ['main'], materials: [], dryRun: false })),
}));

jest.mock('../../../scripts/lib/wiki-sync/wiki/sync-icons', () => ({
	runSyncMaterialIcons: jest.fn(async () => ({
		downloaded: 2,
		skippedExisting: 1,
		failed: 0,
	})),
}));

const { parseWikiSyncArgs } = require('../../../scripts/lib/wiki-sync/cli/parse-args');
const { runCli } = require('../../../scripts/lib/wiki-sync/cli/run');
const { runWikiSync } = require('../../../scripts/lib/wiki-sync/core/pipeline');
const { runSyncMaterialIcons } = require('../../../scripts/lib/wiki-sync/wiki/sync-icons');

describe('wiki-sync / cli', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	describe('parseWikiSyncArgs', () => {
		it('détecte tous les drapeaux CLI', () => {
			const argv = [
				'--dry-run',
				'--desc-only',
				'--add-missing',
				'--add-missing-only',
				'--sync-icons',
				'--force',
				'--dashboard',
			];
			expect(parseWikiSyncArgs(argv)).toEqual({
				dryRun: true,
				descOnly: true,
				addMissing: true,
				addMissingOnly: true,
				syncIcons: true,
				forceIcons: true,
				dashboard: true,
				argv,
			});
		});

		it('utilise process.argv par défaut', () => {
			const result = parseWikiSyncArgs();
			expect(result).toEqual(expect.objectContaining({
				dryRun: expect.any(Boolean),
				argv: expect.any(Array),
			}));
		});

		it('utilise process.argv.slice(2) par défaut', () => {
			const original = process.argv;
			process.argv = ['node', 'script.js', '--dry-run'];
			expect(parseWikiSyncArgs()).toEqual(expect.objectContaining({ dryRun: true }));
			process.argv = original;
		});
	});

	describe('runCli', () => {
		it('lance runSyncMaterialIcons sans dry-run ni force', async () => {
			const stderr = jest.spyOn(process.stderr, 'write').mockImplementation(() => true);
			await runCli(['--sync-icons']);
			expect(runSyncMaterialIcons).toHaveBeenCalledWith(expect.objectContaining({
				dryRun: false,
				force: false,
			}));
			const out = stderr.mock.calls.map((c) => c[0]).join('');
			expect(out).toContain('Sync icônes');
			expect(out).not.toContain('dry-run');
			expect(out).not.toContain('(force)');
			stderr.mockRestore();
		});

		it('lance runSyncMaterialIcons en mode icônes avec dry-run et force', async () => {
			const stderr = jest.spyOn(process.stderr, 'write').mockImplementation(() => true);
			const result = await runCli(['--sync-icons', '--dry-run', '--force']);
			expect(runSyncMaterialIcons).toHaveBeenCalledWith(expect.objectContaining({
				dryRun: true,
				force: true,
			}));
			expect(result).toEqual({ downloaded: 2, skippedExisting: 1, failed: 0 });
			expect(stderr.mock.calls.map((c) => c[0]).join('')).toMatch(/dry-run|\(force\)|Terminé/);
			stderr.mockRestore();
		});

		it('lance runSyncMaterialIcons avec dry-run seul', async () => {
			const stderr = jest.spyOn(process.stderr, 'write').mockImplementation(() => true);
			await runCli(['--sync-icons', '--dry-run']);
			expect(stderr.mock.calls.map((c) => c[0]).join('')).toContain('dry-run');
			stderr.mockRestore();
		});

		it('lance runSyncMaterialIcons avec force seul', async () => {
			const stderr = jest.spyOn(process.stderr, 'write').mockImplementation(() => true);
			await runCli(['--sync-icons', '--force']);
			expect(stderr.mock.calls.map((c) => c[0]).join('')).toContain('(force)');
			stderr.mockRestore();
		});

		it('utilise process.argv par défaut', async () => {
			const original = process.argv;
			process.argv = ['node', 'script.js'];
			await runCli();
			expect(runWikiSync).toHaveBeenCalled();
			process.argv = original;
		});

		it('logue add-missing-only puis délègue à runWikiSync', async () => {
			const stderr = jest.spyOn(process.stderr, 'write').mockImplementation(() => true);
			await runCli(['--add-missing-only', '--dashboard']);

			expect(runWikiSync).toHaveBeenCalledWith(expect.objectContaining({
				addMissingOnly: true,
				dashboard: true,
			}));
			expect(stderr).toHaveBeenCalledWith(expect.stringContaining('--add-missing-only'));

			stderr.mockRestore();
		});

		it('logue add-missing puis délègue à runWikiSync', async () => {
			const stderr = jest.spyOn(process.stderr, 'write').mockImplementation(() => true);
			await runCli(['--add-missing', '--desc-only']);

			expect(runWikiSync).toHaveBeenCalledWith(expect.objectContaining({
				addMissing: true,
				descOnly: true,
			}));
			expect(stderr).toHaveBeenCalledWith(expect.stringContaining('--add-missing'));

			stderr.mockRestore();
		});

		it('délègue runWikiSync pour le flux par défaut', async () => {
			await runCli([]);
			expect(runWikiSync).toHaveBeenCalledWith(expect.objectContaining({
				dryRun: false,
				syncIcons: false,
			}));
		});
	});
});
