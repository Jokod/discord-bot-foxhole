'use strict';

const path = require('path');

const {
	BATCH_SIZE,
	BATCH_DELAY_MS,
	WIKI_HUB_TITLES,
	WIKI_SCAN_CATEGORIES,
	WIKI_EXTRA_SCAN_TITLES,
	WIKI_NOT_LOGISTICS_TITLES,
	WIKI_COVERED_BY_CATALOG_HUBS,
} = require('../config');
const {
	sleep,
	isFrenchUniformEntry,
	inferWikiTitle,
	wikiFactionToArray,
	canonicalInfoboxNameForCatalog,
} = require('../wiki/title-resolver');
const { extractFirstInfoboxFaction } = require('../wiki/infobox-parser');
const { descriptionFromWikitext } = require('../wiki/description');
const { parseItemOrVehicleInfobox } = require('../wiki/infobox-parser');
const { routeWikiInfoboxToMaterialFile } = require('../wiki/router');
const { createWikiClient, fetchCategoryPageTitles, fetchWikitextForTitles } = require('../wiki/client');
const { PageCache } = require('../wiki/cache');
const { RateLimiter } = require('../wiki/rate-limiter');
const {
	loadAllMaterialFiles,
	writeMaterialFile,
	applyCatalogMaintenance,
	flushModifiedMaterialFiles,
} = require('./catalog');
const { createReport, emitProgress } = require('./report');
const { runSyncMaterialIcons } = require('../wiki/sync-icons');
const { assertNotAborted } = require('../wiki/errors');

function isWriteAllowed({ dryRun, dashboard }) {
	if (dryRun) {
		return false;
	}
	if (!dashboard) {
		return true;
	}
	const flag = process.env.WIKI_SYNC_WRITE;
	return flag === '1' || flag === 'true';
}

/**
 * @param {import('../wiki/cache').PageCache} cache
 * @param {ReturnType<import('../wiki/client').createWikiClient>} wikiClient
 */
async function fetchWikitextBatched(titles, cache, wikiClient, onProgress, shouldAbort) {
	const uniqueTitles = [...new Set(titles)];
	const titleToWikitext = new Map();

	for (let i = 0; i < uniqueTitles.length; i += BATCH_SIZE) {
		assertNotAborted(shouldAbort);
		const batch = uniqueTitles.slice(i, i + BATCH_SIZE);
		emitProgress(onProgress, {
			phase: 'fetch-wikitext',
			batch: i / BATCH_SIZE + 1,
			totalBatches: Math.ceil(uniqueTitles.length / BATCH_SIZE),
			size: batch.length,
		});
		process.stderr.write(`Lot wiki ${i / BATCH_SIZE + 1}/${Math.ceil(uniqueTitles.length / BATCH_SIZE)} (${batch.length} pages)…\n`);
		const result = await wikiClient.fetchWikitextForTitles(batch);
		for (const t of batch) {
			const content = result.get(t);
			titleToWikitext.set(t, content);
			if (cache && !cache.has(t)) {
				cache.set(t, content);
			}
		}
		if (i + BATCH_SIZE < uniqueTitles.length) {
			await sleep(BATCH_DELAY_MS);
		}
	}

	return titleToWikitext;
}

function resolveWikiClient({ wikiClient, cache, rateLimiter }) {
	if (wikiClient) {
		return wikiClient;
	}
	if (cache || rateLimiter) {
		return createWikiClient({ cache, rateLimiter });
	}
	return {
		fetchCategoryPageTitles,
		fetchWikitextForTitles,
	};
}

async function runAddMissing(dryRun, materialsRoot, fileGroups, { wikiClient, cache, rateLimiter, onProgress, shouldAbort } = {}) {
	const client = resolveWikiClient({ wikiClient, cache, rateLimiter });
	const existingItemNames = new Set();
	const knownWikiTitles = new Set();
	const filePathByRel = new Map();

	for (const { filePath, materials } of fileGroups) {
		const rel = path.relative(materialsRoot, filePath).split(path.sep).join('/');
		filePathByRel.set(rel, filePath);
		for (const m of materials) {
			existingItemNames.add(m.itemName);
			if (!isFrenchUniformEntry(m)) {
				knownWikiTitles.add(inferWikiTitle(m.itemName));
			}
		}
	}

	const wikiTitlesUnion = new Set();
	for (let c = 0; c < WIKI_SCAN_CATEGORIES.length; c++) {
		assertNotAborted(shouldAbort);
		const cat = WIKI_SCAN_CATEGORIES[c];
		emitProgress(onProgress, { phase: 'scan-category', category: cat });
		process.stderr.write(`Catégorie wiki : ${cat}…\n`);
		const members = await client.fetchCategoryPageTitles(cat);
		for (const t of members) {
			wikiTitlesUnion.add(t);
		}
		if (c < WIKI_SCAN_CATEGORIES.length - 1) {
			await sleep(BATCH_DELAY_MS);
		}
	}
	for (const t of WIKI_EXTRA_SCAN_TITLES) {
		wikiTitlesUnion.add(t);
	}

	const candidates = [...wikiTitlesUnion].filter((t) => {
		if (WIKI_HUB_TITLES.has(t) || t.includes('/')) {
			return false;
		}
		if (WIKI_NOT_LOGISTICS_TITLES.has(t) || WIKI_COVERED_BY_CATALOG_HUBS.has(t)) {
			return false;
		}
		if (existingItemNames.has(t)) {
			return false;
		}
		if (knownWikiTitles.has(t)) {
			return false;
		}
		return true;
	});

	process.stderr.write(`Pages candidates (hors déjà suivies) : ${candidates.length}\n`);

	const additionsByRel = new Map();
	const unrouted = [];
	let fetched = 0;
	let skipNoWikitext = 0;
	let skipRedirect = 0;
	let skipNoInfobox = 0;
	let skipDupInfoboxName = 0;

	for (let i = 0; i < candidates.length; i += BATCH_SIZE) {
		assertNotAborted(shouldAbort);
		const batch = candidates.slice(i, i + BATCH_SIZE);
		const result = await client.fetchWikitextForTitles(batch);
		for (const title of batch) {
			const wt = result.get(title);
			fetched++;
			if (wt == null) {
				skipNoWikitext++;
				continue;
			}
			if (wt.trimStart().startsWith('#REDIRECT')) {
				skipRedirect++;
				continue;
			}
			const parsed = parseItemOrVehicleInfobox(wt);
			if (!parsed) {
				skipNoInfobox++;
				continue;
			}
			const route = routeWikiInfoboxToMaterialFile(parsed);
			const displayName = canonicalInfoboxNameForCatalog((parsed.fields.name || '').trim());
			if (!route || !displayName) {
				unrouted.push({
					title,
					reason: 'no_route_or_name',
					category: parsed.fields.category,
					type: parsed.fields.type,
					profile: parsed.fields.ItemProfileType,
				});
				continue;
			}
			if (existingItemNames.has(displayName)) {
				skipDupInfoboxName++;
				continue;
			}

			const facRaw = extractFirstInfoboxFaction(wt);
			let faction = wikiFactionToArray(facRaw);
			if (!faction) {
				faction = ['colonial', 'warden'];
			}
			faction = [...faction].sort();

			const itemDesc = descriptionFromWikitext(wt) || '—';
			const entry = {
				faction,
				itemName: displayName,
				itemDesc,
				itemCategory: route.itemCategory,
			};

			if (!additionsByRel.has(route.relPath)) {
				additionsByRel.set(route.relPath, []);
			}
			additionsByRel.get(route.relPath).push(entry);
			existingItemNames.add(displayName);
		}
		if (i + BATCH_SIZE < candidates.length) {
			await sleep(BATCH_DELAY_MS);
		}
	}

	let addedCount = 0;
	const modifiedPaths = new Set();

	for (const [relPath, entries] of additionsByRel) {
		const fp = filePathByRel.get(relPath);
		if (!fp) {
			process.stderr.write(`Chemin inconnu : ${relPath}\n`);
			continue;
		}
		const group = fileGroups.find((g) => g.filePath === fp);
		if (!group) {
			continue;
		}
		for (const e of entries) {
			if (dryRun) {
				process.stdout.write(`[add] ${relPath} ← ${e.itemName}\n`);
			}
			else {
				group.materials.push(e);
			}
			addedCount++;
		}
		modifiedPaths.add(fp);
	}

	if (!dryRun) {
		flushModifiedMaterialFiles(modifiedPaths, fileGroups);
	}

	if (addedCount === 0) {
		process.stderr.write(`\nAucune nouvelle entrée (${fetched} page(s) analysée(s)).\n`);
	}
	else {
		process.stderr.write(`\nAjout : ${addedCount} entrée(s) répartie(s) sur ${additionsByRel.size} fichier(s). Pages wiki analysées : ${fetched}.\n`);
	}
	const queuedNew = [...additionsByRel.values()].reduce((n, arr) => n + arr.length, 0);
	const detailParts = [];
	if (skipNoWikitext) detailParts.push(`${skipNoWikitext} sans wikitext`);
	if (skipRedirect) detailParts.push(`${skipRedirect} redirection`);
	if (skipNoInfobox) detailParts.push(`${skipNoInfobox} sans infobox item/véhicule parsable`);
	if (skipDupInfoboxName) detailParts.push(`${skipDupInfoboxName} nom d’infobox déjà en catalogue (titre wiki ≠ entrée suivie)`);
	if (unrouted.length) detailParts.push(`${unrouted.length} infobox non mappée`);
	if (queuedNew) detailParts.push(`${queuedNew} nouvelle(s) ligne(s) JSON`);
	if (detailParts.length && fetched > 0) {
		process.stderr.write(`  Détail : ${detailParts.join(' · ')}\n`);
	}
	if (unrouted.length) {
		process.stderr.write(`\nNon routés (infobox non mappée), ${Math.min(unrouted.length, 25)} exemples :\n`);
		for (const u of unrouted.slice(0, 25)) {
			process.stderr.write(`  ${u.title} | cat=${u.category} type=${u.type} profile=${u.profile}\n`);
		}
		if (unrouted.length > 25) {
			process.stderr.write(`  … ${unrouted.length - 25} de plus\n`);
		}
	}

	if (dryRun) {
		process.stderr.write('\n[--dry-run] Aucun fichier modifié pour --add-missing.\n');
		return fileGroups;
	}

	return loadAllMaterialFiles(materialsRoot);
}

async function runSyncDescriptionsAndFactions(fileGroups, { dryRun, descOnly, wikiClient, cache, rateLimiter, onProgress, shouldAbort } = {}) {
	const client = resolveWikiClient({ wikiClient, cache, rateLimiter });
	const titleToItems = new Map();

	for (const { filePath, materials } of fileGroups) {
		for (const m of materials) {
			if (isFrenchUniformEntry(m)) {
				continue;
			}
			const wikiTitle = inferWikiTitle(m.itemName);
			if (!titleToItems.has(wikiTitle)) {
				titleToItems.set(wikiTitle, []);
			}
			titleToItems.get(wikiTitle).push({ filePath, material: m });
		}
	}

	const uniqueTitles = [...titleToItems.keys()];
	const titleToWikitext = await fetchWikitextBatched(uniqueTitles, cache, client, onProgress, shouldAbort);

	let updated = 0;
	let skipped = 0;
	const missing = [];

	for (const { filePath, materials } of fileGroups) {
		let fileChanged = false;
		for (const m of materials) {
			if (isFrenchUniformEntry(m)) {
				continue;
			}
			const wikiTitle = inferWikiTitle(m.itemName);
			const wt = titleToWikitext.get(wikiTitle);
			if (wt == null) {
				missing.push({ itemName: m.itemName, wikiTitle });
				skipped++;
				continue;
			}

			const newDesc = descriptionFromWikitext(wt);
			if (newDesc && newDesc !== m.itemDesc) {
				if (dryRun) {
					process.stdout.write(`[desc] ${m.itemName}\n  - ${m.itemDesc.slice(0, 80)}…\n  + ${newDesc.slice(0, 80)}…\n`);
				}
				m.itemDesc = newDesc;
				fileChanged = true;
				updated++;
			}
			else if (!newDesc) {
				skipped++;
			}

			if (!descOnly) {
				const facRaw = extractFirstInfoboxFaction(wt);
				const facArr = wikiFactionToArray(facRaw);
				if (facArr) {
					const prev = JSON.stringify(m.faction);
					const next = JSON.stringify(facArr.sort());
					if (prev !== next) {
						if (dryRun) {
							process.stdout.write(`[faction] ${m.itemName}\n  - ${prev}\n  + ${next}\n`);
						}
						m.faction = facArr;
						fileChanged = true;
						updated++;
					}
				}
			}
		}

		if (fileChanged && !dryRun) {
			const sorted = writeMaterialFile(filePath, materials);
			materials.splice(0, materials.length, ...sorted);
		}
	}

	process.stderr.write(`\nTerminé. Descriptions/factions touchées : ~${updated} (compte séparé si les deux changent). Ignorés ou inchangés : ${skipped}.\n`);
	if (missing.length) {
		process.stderr.write(`\nPages wiki introuvables (${missing.length}) — ajouter WIKI_TITLE_OVERRIDES dans scripts/lib/wiki-sync/config/overrides/titles.json si besoin :\n`);
		for (const x of missing.slice(0, 40)) {
			process.stderr.write(`  itemName=${JSON.stringify(x.itemName)} → tentative titre=${JSON.stringify(x.wikiTitle)}\n`);
		}
		if (missing.length > 40) {
			process.stderr.write(`  … et ${missing.length - 40} autres\n`);
		}
	}
}

/**
 * Unified wiki sync pipeline with shared PageCache and progress hooks.
 * @param {object} opts
 */
async function runWikiSync(opts = {}) {
	const {
		materialsRoot,
		iconsDir,
		dryRun = false,
		descOnly = false,
		addMissing = false,
		addMissingOnly = false,
		syncIcons = false,
		forceIcons = false,
		dashboard = false,
		onProgress,
		shouldAbort,
		fetchImpl,
		wikiClient: wikiClientOpt,
		log,
	} = opts;

	const canWrite = isWriteAllowed({ dryRun, dashboard });
	const effectiveDryRun = !canWrite;
	const report = createReport({ log });
	const cache = new PageCache();
	const rateLimiter = new RateLimiter();
	const wikiClient = wikiClientOpt || createWikiClient({ rateLimiter, cache, fetchImpl });

	const result = {
		phases: [],
		materials: null,
		icons: null,
		dryRun: effectiveDryRun,
	};

	if (!materialsRoot) {
		throw new Error('materialsRoot requis');
	}

	assertNotAborted(shouldAbort);
	emitProgress(onProgress, { phase: 'start', dryRun: effectiveDryRun });
	report.phase('maintenance');
	let fileGroups = loadAllMaterialFiles(materialsRoot);
	fileGroups = applyCatalogMaintenance(fileGroups, materialsRoot, effectiveDryRun);

	if (addMissingOnly || addMissing) {
		assertNotAborted(shouldAbort);
		report.phase('add-missing');
		emitProgress(onProgress, { phase: 'add-missing' });
		fileGroups = await runAddMissing(effectiveDryRun, materialsRoot, fileGroups, {
			wikiClient,
			cache,
			onProgress,
			shouldAbort,
		});
	}

	if (addMissingOnly) {
		process.stderr.write(
			'\n[--add-missing-only] Arrêt ici (aucune passe globale descriptions/factions). '
			+ 'Lancez `npm run wiki:sync-materials` pour aligner tout le catalogue sur le wiki.\n',
		);
		result.phases = report.getPhases();
		result.materials = fileGroups;
		return result;
	}

	if (addMissing) {
		process.stderr.write(
			'\n→ Synchro wiki : descriptions / factions sur l’ensemble des matériels (y compris les lignes ajoutées)…\n',
		);
	}

	if (!syncIcons) {
		assertNotAborted(shouldAbort);
		report.phase('descriptions-factions');
		emitProgress(onProgress, { phase: 'descriptions-factions' });
		await runSyncDescriptionsAndFactions(fileGroups, {
			dryRun: effectiveDryRun,
			descOnly,
			wikiClient,
			cache,
			onProgress,
			shouldAbort,
		});
	}

	if (syncIcons && iconsDir) {
		assertNotAborted(shouldAbort);
		report.phase('icons');
		emitProgress(onProgress, { phase: 'icons' });
		result.icons = await runSyncMaterialIcons({
			materialsRoot,
			iconsDir,
			dryRun: effectiveDryRun,
			force: forceIcons,
			fetchImpl,
			fetchWikitext: (titles) => wikiClient.fetchWikitextForTitles(titles),
			log: log || ((msg) => process.stderr.write(`${msg}\n`)),
			shouldAbort,
		});
	}

	assertNotAborted(shouldAbort);
	result.phases = report.getPhases();
	result.materials = fileGroups;
	emitProgress(onProgress, { phase: 'done' });
	return result;
}

module.exports = {
	isWriteAllowed,
	runWikiSync,
	runAddMissing,
	runSyncDescriptionsAndFactions,
	flushModifiedMaterialFiles,
};
