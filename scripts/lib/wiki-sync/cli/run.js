'use strict';

const path = require('path');
const { parseWikiSyncArgs } = require('./parse-args');
const { runWikiSync } = require('../core/pipeline');
const { runSyncMaterialIcons } = require('../wiki/sync-icons');

async function runCli(argv = process.argv.slice(2)) {
	const args = parseWikiSyncArgs(argv);
	const root = path.join(__dirname, '..', '..', '..');
	const materialsRoot = path.join(root, 'data', 'materials');
	const iconsDir = path.join(root, 'assets', 'icons', 'materials');

	if (args.syncIcons && !args.addMissing && !args.addMissingOnly && !args.descOnly) {
		process.stderr.write(
			`Sync icônes matériaux → ${path.relative(root, iconsDir)}`
			+ `${args.dryRun ? ' (dry-run)' : ''}${args.forceIcons ? ' (force)' : ''}\n`,
		);
		const result = await runSyncMaterialIcons({
			materialsRoot,
			iconsDir,
			dryRun: args.dryRun,
			force: args.forceIcons,
		});
		process.stderr.write(
			`\nTerminé. Téléchargés : ${result.downloaded}, déjà présents : ${result.skippedExisting}, échecs : ${result.failed}.\n`,
		);
		return result;
	}

	if (args.addMissingOnly) {
		process.stderr.write('Mode : --add-missing-only (import wiki uniquement)\n');
	}
	else if (args.addMissing) {
		process.stderr.write('Mode : --add-missing (import wiki puis synchro descriptions / factions sur tout le catalogue)\n');
	}

	return runWikiSync({
		materialsRoot,
		iconsDir,
		dryRun: args.dryRun,
		descOnly: args.descOnly,
		addMissing: args.addMissing,
		addMissingOnly: args.addMissingOnly,
		syncIcons: args.syncIcons,
		forceIcons: args.forceIcons,
		dashboard: args.dashboard,
	});
}

module.exports = {
	runCli,
};
