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

const { runCli } = require('./lib/wiki-sync/cli/run');

runCli(['--sync-icons', ...process.argv.slice(2)]).catch((err) => {
	console.error(err);
	process.exit(1);
});
