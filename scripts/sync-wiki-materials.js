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

const path = require('path');

const { runAddMissing } = require('./lib/wiki-sync/add-missing');
const { applyCatalogMaintenance, loadAllMaterialFiles } = require('./lib/wiki-sync/materials-store');
const { runSyncDescriptionsAndFactions } = require('./lib/wiki-sync/sync-descriptions');

async function main() {
	const dryRun = process.argv.includes('--dry-run');
	const descOnly = process.argv.includes('--desc-only');
	const addMissing = process.argv.includes('--add-missing');
	const addMissingOnly = process.argv.includes('--add-missing-only');
	const materialsRoot = path.join(__dirname, '..', 'data', 'materials');

	if (addMissingOnly) {
		process.stderr.write('Mode : --add-missing-only (import wiki uniquement)\n');
	}
	else if (addMissing) {
		process.stderr.write('Mode : --add-missing (import wiki puis synchro descriptions / factions sur tout le catalogue)\n');
	}

	let fileGroups = loadAllMaterialFiles(materialsRoot);
	fileGroups = applyCatalogMaintenance(fileGroups, materialsRoot, dryRun);

	if (addMissingOnly) {
		await runAddMissing(dryRun, materialsRoot, fileGroups);
		process.stderr.write(
			'\n[--add-missing-only] Arrêt ici (aucune passe globale descriptions/factions). '
			+ 'Lancez `npm run wiki:sync-materials` pour aligner tout le catalogue sur le wiki.\n',
		);
		return;
	}

	if (addMissing) {
		fileGroups = await runAddMissing(dryRun, materialsRoot, fileGroups);
		process.stderr.write(
			'\n→ Synchro wiki : descriptions / factions sur l’ensemble des matériels (y compris les lignes ajoutées)…\n',
		);
	}

	await runSyncDescriptionsAndFactions(fileGroups, { dryRun, descOnly });
}

main().catch(err => {
	console.error(err);
	process.exit(1);
});
