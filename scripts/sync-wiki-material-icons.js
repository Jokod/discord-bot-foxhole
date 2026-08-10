#!/usr/bin/env node
/**
 * Télécharge les icônes d’items depuis foxhole.wiki.gg vers assets/icons/materials/
 * (champ | image = de l’infobox). Le dashboard sert ces fichiers en local.
 *
 * Usage:
 *   node scripts/sync-wiki-material-icons.js
 *   node scripts/sync-wiki-material-icons.js --dry-run
 *   node scripts/sync-wiki-material-icons.js --force
 */

'use strict';

const path = require('path');
const { runSyncMaterialIcons } = require('./lib/wiki-sync/sync-icons');

async function main() {
	const dryRun = process.argv.includes('--dry-run');
	const force = process.argv.includes('--force');
	const root = path.join(__dirname, '..');
	const materialsRoot = path.join(root, 'data', 'materials');
	const iconsDir = path.join(root, 'assets', 'icons', 'materials');

	process.stderr.write(
		`Sync icônes matériaux → ${path.relative(root, iconsDir)}`
		+ `${dryRun ? ' (dry-run)' : ''}${force ? ' (force)' : ''}\n`,
	);

	const result = await runSyncMaterialIcons({
		materialsRoot,
		iconsDir,
		dryRun,
		force,
	});

	process.stderr.write(
		`\nTerminé. Téléchargés : ${result.downloaded}, déjà présents : ${result.skippedExisting}, échecs : ${result.failed}.\n`,
	);
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
