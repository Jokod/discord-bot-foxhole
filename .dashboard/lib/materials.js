'use strict';

const fs = require('fs');
const path = require('path');
const { categories } = require('../../data/fournis');
const { PUBLIC_ICON_PREFIX, canonicalIconFilename, inferWikiTitle } = require('../../scripts/lib/wiki-sync');

const DEFAULT_MATERIALS_ROOT = path.join(__dirname, '..', '..', 'data', 'materials');
const DEFAULT_ICONS_DIR = path.join(__dirname, '..', '..', 'assets', 'icons', 'materials');
const CATALOG_CACHE_TTL_MS = 30_000;

let catalogCache = null;
let catalogCacheAt = 0;

function loadManifest(iconsDir) {
	const manifestPath = path.join(iconsDir, 'manifest.json');
	if (!fs.existsSync(manifestPath)) return {};
	try {
		return JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
	}
	catch {
		return {};
	}
}

function resolveIconUrl(itemName, iconsDir, manifest) {
	const fromManifest = manifest[itemName];
	const candidates = [];
	if (fromManifest) candidates.push(fromManifest);

	for (const file of candidates) {
		const safe = canonicalIconFilename(file);
		if (!safe) continue;
		const full = path.join(iconsDir, safe);
		if (fs.existsSync(full) && fs.statSync(full).isFile()) {
			return `${PUBLIC_ICON_PREFIX}/${encodeURIComponent(safe)}`;
		}
	}
	return null;
}

function listCatalog({
	materialsRoot = DEFAULT_MATERIALS_ROOT,
	iconsDir = DEFAULT_ICONS_DIR,
	force = false,
} = {}) {
	const useCache = !force
		&& materialsRoot === DEFAULT_MATERIALS_ROOT
		&& iconsDir === DEFAULT_ICONS_DIR;
	const now = Date.now();
	if (useCache && catalogCache && now - catalogCacheAt < CATALOG_CACHE_TTL_MS) {
		return catalogCache;
	}

	const manifest = loadManifest(iconsDir);
	const categoryList = Object.keys(categories).sort().map((id) => ({
		id,
		icon: categories[id].icon || '📦',
		subcategories: Object.keys(categories[id].subcategories || {}).sort(),
	}));

	const items = [];
	for (const cat of categoryList) {
		for (const sub of cat.subcategories) {
			const filePath = path.join(materialsRoot, cat.id, `${sub}.json`);
			if (!fs.existsSync(filePath)) continue;
			let list;
			try {
				list = JSON.parse(fs.readFileSync(filePath, 'utf8'));
			}
			catch {
				continue;
			}
			if (!Array.isArray(list)) continue;
			for (const m of list) {
				if (!m?.itemName) continue;
				const wikiTitle = inferWikiTitle(m.itemName);
				items.push({
					itemName: m.itemName,
					itemDesc: m.itemDesc || '',
					faction: Array.isArray(m.faction) ? m.faction : [],
					itemCategory: m.itemCategory || '',
					category: cat.id,
					subcategory: sub,
					categoryIcon: cat.icon,
					wikiTitle,
					wikiUrl: `https://foxhole.wiki.gg/wiki/${encodeURIComponent(wikiTitle.replace(/ /g, '_'))}`,
					iconUrl: resolveIconUrl(m.itemName, iconsDir, manifest),
					damageDesc: m.damageDesc || undefined,
					vehiclePen: m.vehiclePen || undefined,
					highVelocityBonus: m.highVelocityBonus || undefined,
					numberProducedBonus: m.numberProducedBonus || undefined,
				});
			}
		}
	}

	items.sort((a, b) => a.itemName.localeCompare(b.itemName, 'en'));

	const catalog = {
		categories: categoryList,
		items,
		generated_at: new Date().toISOString(),
		icons: {
			dir: PUBLIC_ICON_PREFIX,
			with_icon: items.filter((i) => i.iconUrl).length,
			total: items.length,
		},
	};

	if (useCache) {
		catalogCache = catalog;
		catalogCacheAt = now;
	}
	return catalog;
}

function resetCatalogCacheForTests() {
	catalogCache = null;
	catalogCacheAt = 0;
}

module.exports = {
	DEFAULT_MATERIALS_ROOT,
	DEFAULT_ICONS_DIR,
	PUBLIC_ICON_PREFIX,
	CATALOG_CACHE_TTL_MS,
	loadManifest,
	resolveIconUrl,
	listCatalog,
	resetCatalogCacheForTests,
};
