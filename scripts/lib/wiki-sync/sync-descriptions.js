'use strict';

const {
	BATCH_SIZE,
	BATCH_DELAY_MS,
} = require('./config');
const { sleep, isFrenchUniformEntry, inferWikiTitle, wikiFactionToArray } = require('./wiki-helpers');
const { extractFirstInfoboxFaction, descriptionFromWikitext } = require('./wiki-content');
const { fetchWikitextForTitles } = require('./wiki-client');
const { writeMaterialFile } = require('./materials-store');

async function runSyncDescriptionsAndFactions(fileGroups, { dryRun, descOnly }) {
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
	const titleToWikitext = new Map();

	for (let i = 0; i < uniqueTitles.length; i += BATCH_SIZE) {
		const batch = uniqueTitles.slice(i, i + BATCH_SIZE);
		process.stderr.write(`Lot wiki ${i / BATCH_SIZE + 1}/${Math.ceil(uniqueTitles.length / BATCH_SIZE)} (${batch.length} pages)…\n`);
		const result = await fetchWikitextForTitles(batch);
		for (const t of batch) {
			const content = result.get(t);
			titleToWikitext.set(t, content);
		}
		if (i + BATCH_SIZE < uniqueTitles.length) {
			await sleep(BATCH_DELAY_MS);
		}
	}

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
		process.stderr.write(`\nPages wiki introuvables (${missing.length}) — ajouter WIKI_TITLE_OVERRIDES dans scripts/lib/wiki-sync/config.js si besoin :\n`);
		for (const x of missing.slice(0, 40)) {
			process.stderr.write(`  itemName=${JSON.stringify(x.itemName)} → tentative titre=${JSON.stringify(x.wikiTitle)}\n`);
		}
		if (missing.length > 40) {
			process.stderr.write(`  … et ${missing.length - 40} autres\n`);
		}
	}
}

module.exports = {
	runSyncDescriptionsAndFactions,
};
