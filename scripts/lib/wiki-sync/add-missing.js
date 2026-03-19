'use strict';

const path = require('path');

const {
	BATCH_SIZE,
	BATCH_DELAY_MS,
	WIKI_HUB_TITLES,
	WIKI_SCAN_CATEGORIES,
	WIKI_NOT_LOGISTICS_TITLES,
} = require('./config');
const {
	sleep,
	isFrenchUniformEntry,
	inferWikiTitle,
	wikiFactionToArray,
	canonicalInfoboxNameForCatalog,
} = require('./wiki-helpers');
const {
	extractFirstInfoboxFaction,
	descriptionFromWikitext,
	parseItemOrVehicleInfobox,
} = require('./wiki-content');
const { routeWikiInfoboxToMaterialFile } = require('./wiki-route');
const { fetchCategoryPageTitles, fetchWikitextForTitles } = require('./wiki-client');
const { loadAllMaterialFiles, writeMaterialFile } = require('./materials-store');

async function runAddMissing(dryRun, materialsRoot, fileGroups) {
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
		const cat = WIKI_SCAN_CATEGORIES[c];
		process.stderr.write(`Catégorie wiki : ${cat}…\n`);
		const members = await fetchCategoryPageTitles(cat);
		for (const t of members) {
			wikiTitlesUnion.add(t);
		}
		if (c < WIKI_SCAN_CATEGORIES.length - 1) {
			await sleep(BATCH_DELAY_MS);
		}
	}

	const candidates = [...wikiTitlesUnion].filter(t => {
		if (WIKI_HUB_TITLES.has(t) || t.includes('/')) {
			return false;
		}
		if (WIKI_NOT_LOGISTICS_TITLES.has(t)) {
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
		const batch = candidates.slice(i, i + BATCH_SIZE);
		const result = await fetchWikitextForTitles(batch);
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
		const group = fileGroups.find(g => g.filePath === fp);
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
		for (const fp of modifiedPaths) {
			const group = fileGroups.find(g => g.filePath === fp);
			if (group) {
				const sorted = writeMaterialFile(fp, group.materials);
				group.materials.splice(0, group.materials.length, ...sorted);
			}
		}
	}

	if (addedCount === 0) {
		process.stderr.write(`\nAucune nouvelle entrée (${fetched} page(s) analysée(s)).\n`);
	}
	else {
		process.stderr.write(`\nAjout : ${addedCount} entrée(s) répartie(s) sur ${additionsByRel.size} fichier(s). Pages wiki analysées : ${fetched}.\n`);
	}
	const queuedNew = [...additionsByRel.values()].reduce((n, arr) => n + arr.length, 0);
	const detailParts = [];
	if (skipNoWikitext) {
		detailParts.push(`${skipNoWikitext} sans wikitext`);
	}
	if (skipRedirect) {
		detailParts.push(`${skipRedirect} redirection`);
	}
	if (skipNoInfobox) {
		detailParts.push(`${skipNoInfobox} sans infobox item/véhicule parsable`);
	}
	if (skipDupInfoboxName) {
		detailParts.push(`${skipDupInfoboxName} nom d’infobox déjà en catalogue (titre wiki ≠ entrée suivie)`);
	}
	if (unrouted.length) {
		detailParts.push(`${unrouted.length} infobox non mappée`);
	}
	if (queuedNew) {
		detailParts.push(`${queuedNew} nouvelle(s) ligne(s) JSON`);
	}
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

module.exports = {
	runAddMissing,
};
