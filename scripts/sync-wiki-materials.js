#!/usr/bin/env node
/**
 * Synchronise itemDesc (description wiki officielle) et optionnellement faction
 * depuis foxhole.wiki.gg vers data/materials/*.json
 *
 * Les fichiers sous data/materials/ sont la sortie de ce script : ne pas les
 * modifier à la main. Configuration et logique métier : scripts/lib/wiki-sync/
 *
 * Politique wiki.gg : User-Agent personnalisé + pauses entre requêtes.
 *
 * Usage:
 *   node scripts/sync-wiki-materials.js              # écrit les fichiers
 *   node scripts/sync-wiki-materials.js --dry-run  # affiche les changements sans écrire
 *   node scripts/sync-wiki-materials.js --desc-only # ne met pas à jour faction
 *   node scripts/sync-wiki-materials.js --add-missing-only   # uniquement import wiki manquant (pas de synchro desc sur tout le catalogue)
 *   node scripts/sync-wiki-materials.js --add-missing        # import manquant puis synchro descriptions/factions pour TOUS les matériels
 *   node scripts/sync-wiki-materials.js --add-missing --dry-run
 */

'use strict';

const { runCli } = require('./lib/wiki-sync/cli/run');

runCli().catch((err) => {
	console.error(err);
	process.exit(1);
});
