'use strict';

const fs = require('fs');
const path = require('path');

const {
	PRUNE_CATALOG_ITEM_NAMES,
	ITEM_REHOME_TO_REL,
} = require('../config');

function sortMaterialsByName(list) {
	return [...list].sort((a, b) => a.itemName.localeCompare(b.itemName, 'en'));
}

function relPathUnderMaterialsRoot(filePath, materialsRoot) {
	return path.relative(materialsRoot, filePath).split(path.sep).join('/');
}

function validateMaterialEntry(m) {
	if (!m || typeof m !== 'object') {
		throw new Error('Entrée matériau invalide : objet attendu');
	}
	if (!m.itemName || typeof m.itemName !== 'string') {
		throw new Error('Entrée matériau invalide : itemName requis');
	}
	if (!Array.isArray(m.faction)) {
		throw new Error(`Entrée matériau invalide (${m.itemName}) : faction[] requis`);
	}
	if (typeof m.itemDesc !== 'string') {
		throw new Error(`Entrée matériau invalide (${m.itemName}) : itemDesc requis`);
	}
	if (typeof m.itemCategory !== 'string') {
		throw new Error(`Entrée matériau invalide (${m.itemName}) : itemCategory requis`);
	}
}

function validateMaterialList(materials) {
	for (const m of materials) {
		validateMaterialEntry(m);
	}
}

function loadAllMaterialFiles(materialsRoot) {
	const files = [];
	const categoryDirs = fs.readdirSync(materialsRoot, { withFileTypes: true })
		.filter((e) => e.isDirectory())
		.map((e) => e.name);

	for (const cat of categoryDirs) {
		const catPath = path.join(materialsRoot, cat);
		for (const name of fs.readdirSync(catPath)) {
			if (!name.endsWith('.json')) {
				continue;
			}
			const filePath = path.join(catPath, name);
			const list = JSON.parse(fs.readFileSync(filePath, 'utf8'));
			files.push({ filePath, materials: list });
		}
	}
	return files;
}

function writeMaterialFile(filePath, materials) {
	validateMaterialList(materials);
	const sorted = sortMaterialsByName(materials);
	const content = `${JSON.stringify(sorted, null, '\t')}\n`;
	const dir = path.dirname(filePath);
	fs.mkdirSync(dir, { recursive: true });
	const tmpPath = path.join(dir, `.${path.basename(filePath)}.${process.pid}.tmp`);
	fs.writeFileSync(tmpPath, content, 'utf8');
	fs.renameSync(tmpPath, filePath);
	return sorted;
}

/**
 * Prune / rehome. En dry-run : log puis recharge depuis le disque.
 */
function applyCatalogMaintenance(fileGroups, materialsRoot, dryRun) {
	const changed = new Set();
	const pruned = [];
	const rehomeLines = [];

	for (const g of fileGroups) {
		const next = [];
		for (const m of g.materials) {
			if (PRUNE_CATALOG_ITEM_NAMES.has(m.itemName)) {
				pruned.push({ filePath: g.filePath, itemName: m.itemName });
				continue;
			}
			next.push(m);
		}
		if (next.length !== g.materials.length) {
			g.materials = next;
			changed.add(g.filePath);
		}
	}

	const byRel = new Map();
	for (const g of fileGroups) {
		byRel.set(relPathUnderMaterialsRoot(g.filePath, materialsRoot), g);
	}

	for (const g of fileGroups) {
		const fromRel = relPathUnderMaterialsRoot(g.filePath, materialsRoot);
		for (let i = g.materials.length - 1; i >= 0; i--) {
			const m = g.materials[i];
			const targetRel = ITEM_REHOME_TO_REL.get(m.itemName);
			if (!targetRel || fromRel === targetRel) {
				continue;
			}
			const tgt = byRel.get(targetRel);
			if (!tgt) {
				process.stderr.write(`Rehome : fichier cible absent ${targetRel} (${m.itemName})\n`);
				continue;
			}
			g.materials.splice(i, 1);
			tgt.materials.push(m);
			changed.add(g.filePath);
			changed.add(tgt.filePath);
			rehomeLines.push(`${m.itemName} : ${fromRel} → ${targetRel}`);
		}
	}

	if (pruned.length || rehomeLines.length) {
		process.stderr.write('\nMaintenance catalogue (prune / rehome, alignée wiki) :\n');
		for (const p of pruned) {
			process.stderr.write(`  [prune] ${relPathUnderMaterialsRoot(p.filePath, materialsRoot)} — ${p.itemName}\n`);
		}
		for (const r of rehomeLines) {
			process.stderr.write(`  [rehome] ${r}\n`);
		}
	}

	if (dryRun && (pruned.length || rehomeLines.length)) {
		return loadAllMaterialFiles(materialsRoot);
	}

	if (!dryRun && changed.size > 0) {
		for (const fp of changed) {
			const group = fileGroups.find((g) => g.filePath === fp);
			if (!group) {
				continue;
			}
			const sorted = writeMaterialFile(fp, group.materials);
			group.materials.splice(0, group.materials.length, ...sorted);
		}
	}

	return fileGroups;
}

function flushModifiedMaterialFiles(modifiedPaths, fileGroups) {
	for (const fp of modifiedPaths) {
		const group = fileGroups.find((g) => g.filePath === fp);
		if (!group) continue;
		const sorted = writeMaterialFile(fp, group.materials);
		group.materials.splice(0, group.materials.length, ...sorted);
	}
}

function catalogItemNames(materialsRoot) {
	const names = [];
	for (const { materials } of loadAllMaterialFiles(materialsRoot)) {
		for (const m of materials) {
			const { isFrenchUniformEntry } = require('../wiki/title-resolver');
			if (isFrenchUniformEntry(m)) continue;
			if (m.itemName) names.push(m.itemName);
		}
	}
	return names;
}

module.exports = {
	sortMaterialsByName,
	relPathUnderMaterialsRoot,
	loadAllMaterialFiles,
	writeMaterialFile,
	validateMaterialEntry,
	validateMaterialList,
	applyCatalogMaintenance,
	flushModifiedMaterialFiles,
	catalogItemNames,
};
