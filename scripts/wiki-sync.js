#!/usr/bin/env node
/**
 * Point d’entrée unifié pour la synchronisation wiki Foxhole.
 *
 * Usage:
 *   node scripts/wiki-sync.js
 *   node scripts/wiki-sync.js --dry-run
 *   node scripts/wiki-sync.js --desc-only
 *   node scripts/wiki-sync.js --add-missing-only
 *   node scripts/wiki-sync.js --add-missing
 *   node scripts/wiki-sync.js --sync-icons [--force]
 */

'use strict';

const { runCli } = require('./lib/wiki-sync/cli/run');

runCli().catch((err) => {
	console.error(err);
	process.exit(1);
});
