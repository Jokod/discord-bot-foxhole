'use strict';

const fs = require('fs');
const path = require('path');

const {
	BATCH_SIZE,
	BATCH_DELAY_MS,
	WIKI_API,
	USER_AGENT,
	WIKI_ICON_PAGE_OVERRIDES,
} = require('./config');
const { sleep, isFrenchUniformEntry, inferWikiTitle } = require('./wiki-helpers');

function resolveIconWikiTitle(itemName) {
	if (Object.prototype.hasOwnProperty.call(WIKI_ICON_PAGE_OVERRIDES, itemName)) {
		return WIKI_ICON_PAGE_OVERRIDES[itemName];
	}
	return inferWikiTitle(itemName);
}
const { extractInfoboxImage } = require('./wiki-content');
const { fetchWikitextForTitles } = require('./wiki-client');
const { loadAllMaterialFiles } = require('./materials-store');

const PUBLIC_ICON_PREFIX = '/assets/icons/materials';
const MAX_ICON_BYTES = 512 * 1024;
const ALLOWED_ICON_HOSTS = new Set(['foxhole.wiki.gg']);

function safeIconFilename(name) {
	const raw = String(name || '').trim();
	if (!raw || raw.includes('..') || raw.includes('/') || raw.includes('\\')) {
		return null;
	}
	const base = path.basename(raw);
	if (base !== raw) {
		return null;
	}
	if (!/\.(png|jpe?g|webp|gif)$/i.test(base)) {
		return null;
	}
	return base;
}

/** MediaWiki stocke les fichiers avec `_` ; normalise aussi pour des URLs sans espaces. */
function canonicalIconFilename(name) {
	const safe = safeIconFilename(name);
	if (!safe) return null;
	return safe.replace(/ /g, '_');
}

function mediaWikiFileKey(name) {
	return String(name || '').replace(/ /g, '_');
}

function isAllowedIconUrl(fileUrl) {
	let u;
	try {
		u = new URL(String(fileUrl || ''));
	}
	catch {
		return false;
	}
	if (u.protocol !== 'https:') return false;
	if (u.username || u.password) return false;
	const host = u.hostname.toLowerCase();
	if (!ALLOWED_ICON_HOSTS.has(host)) return false;
	// Only wiki media paths (no arbitrary endpoints on the host).
	if (!u.pathname.startsWith('/images/')) return false;
	return true;
}

function detectImageKind(buf) {
	if (!Buffer.isBuffer(buf) || buf.length < 12) return null;
	if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47
		&& buf[4] === 0x0d && buf[5] === 0x0a && buf[6] === 0x1a && buf[7] === 0x0a) {
		return 'png';
	}
	if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'jpeg';
	if (buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x38) return 'gif';
	if (buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46
		&& buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50) {
		return 'webp';
	}
	return null;
}

function extensionMatchesKind(filename, kind) {
	const ext = path.extname(filename).toLowerCase();
	if (kind === 'png') return ext === '.png';
	if (kind === 'jpeg') return ext === '.jpg' || ext === '.jpeg';
	if (kind === 'gif') return ext === '.gif';
	if (kind === 'webp') return ext === '.webp';
	return false;
}

function catalogItemNames(materialsRoot) {
	const names = [];
	for (const { materials } of loadAllMaterialFiles(materialsRoot)) {
		for (const m of materials) {
			if (isFrenchUniformEntry(m)) continue;
			if (m.itemName) names.push(m.itemName);
		}
	}
	return names;
}

async function fetchImageInfoUrls(filenames, { fetchImpl = fetch } = {}) {
	const urlByFile = new Map();
	if (!filenames.length) return urlByFile;

	for (let i = 0; i < filenames.length; i += BATCH_SIZE) {
		const batch = filenames.slice(i, i + BATCH_SIZE);
		const url = new URL(WIKI_API);
		url.searchParams.set('action', 'query');
		url.searchParams.set('format', 'json');
		url.searchParams.set('prop', 'imageinfo');
		url.searchParams.set('iiprop', 'url');
		url.searchParams.set('titles', batch.map((f) => `File:${f}`).join('|'));

		const res = await fetchImpl(url, { headers: { 'User-Agent': USER_AGENT } });
		const data = await res.json();
		if (data.error) {
			throw new Error(`API imageinfo: ${data.error.code} — ${data.error.info}`);
		}
		for (const page of Object.values(data.query?.pages || {})) {
			const title = page.title || '';
			const file = title.replace(/^File:/i, '');
			const infoUrl = page.imageinfo?.[0]?.url;
			if (file && infoUrl && page.missing === undefined && isAllowedIconUrl(infoUrl)) {
				urlByFile.set(mediaWikiFileKey(file), infoUrl);
			}
		}
		if (i + BATCH_SIZE < filenames.length) {
			await sleep(BATCH_DELAY_MS);
		}
	}
	return urlByFile;
}

async function downloadBinary(fileUrl, destPath, { fetchImpl = fetch, expectedName = null } = {}) {
	if (!isAllowedIconUrl(fileUrl)) {
		throw new Error(`URL icône refusée (hôte/chemin non autorisé): ${fileUrl}`);
	}
	const res = await fetchImpl(fileUrl, { headers: { 'User-Agent': USER_AGENT } });
	if (!res.ok) {
		throw new Error(`HTTP ${res.status} for ${fileUrl}`);
	}
	const ctype = String(res.headers?.get?.('content-type') || '').toLowerCase();
	if (ctype && !ctype.startsWith('image/')) {
		throw new Error(`Content-Type non image: ${ctype}`);
	}
	const lenHeader = Number(res.headers?.get?.('content-length') || 0);
	if (lenHeader > MAX_ICON_BYTES) {
		throw new Error(`Fichier trop volumineux (${lenHeader} o)`);
	}
	const buf = Buffer.from(await res.arrayBuffer());
	if (buf.length === 0 || buf.length > MAX_ICON_BYTES) {
		throw new Error(`Taille invalide (${buf.length} o)`);
	}
	const kind = detectImageKind(buf);
	if (!kind) {
		throw new Error('Magic bytes non reconnus (pas une image raster)');
	}
	const nameForExt = expectedName || path.basename(destPath);
	if (!extensionMatchesKind(nameForExt, kind)) {
		throw new Error(`Extension ${path.extname(nameForExt)} incompatible avec ${kind}`);
	}
	fs.writeFileSync(destPath, buf);
	return buf.length;
}

/**
 * @param {{ materialsRoot: string, iconsDir: string, dryRun?: boolean, force?: boolean, fetchImpl?: typeof fetch, fetchWikitext?: typeof fetchWikitextForTitles, log?: Function }} opts
 */
async function runSyncMaterialIcons(opts) {
	const {
		materialsRoot,
		iconsDir,
		dryRun = false,
		force = false,
		fetchImpl = fetch,
		fetchWikitext = fetchWikitextForTitles,
		log = (msg) => process.stderr.write(`${msg}\n`),
	} = opts;

	if (!dryRun) {
		fs.mkdirSync(iconsDir, { recursive: true });
	}

	const itemNames = catalogItemNames(materialsRoot);
	const titleToItems = new Map();
	for (const itemName of itemNames) {
		const wikiTitle = resolveIconWikiTitle(itemName);
		if (!titleToItems.has(wikiTitle)) titleToItems.set(wikiTitle, []);
		titleToItems.get(wikiTitle).push(itemName);
	}

	const uniqueTitles = [...titleToItems.keys()];
	const titleToImage = new Map();
	const titleMissingPage = new Set();

	for (let i = 0; i < uniqueTitles.length; i += BATCH_SIZE) {
		const batch = uniqueTitles.slice(i, i + BATCH_SIZE);
		log(`Lot wiki ${i / BATCH_SIZE + 1}/${Math.ceil(uniqueTitles.length / BATCH_SIZE)} (${batch.length} pages)…`);
		const result = await fetchWikitext(batch);
		for (const t of batch) {
			const wt = result.get(t);
			if (wt == null) {
				titleMissingPage.add(t);
				titleToImage.set(t, null);
			}
			else {
				titleToImage.set(t, extractInfoboxImage(wt));
			}
		}
		if (i + BATCH_SIZE < uniqueTitles.length) {
			await sleep(BATCH_DELAY_MS);
		}
	}

	const manifest = {};
	const neededFiles = new Set();
	const missingPages = [];
	const missingImage = [];

	for (const [wikiTitle, names] of titleToItems) {
		if (titleMissingPage.has(wikiTitle)) {
			for (const n of names) missingPages.push({ itemName: n, wikiTitle });
			continue;
		}
		const image = titleToImage.get(wikiTitle);
		if (!image) {
			for (const n of names) missingImage.push({ itemName: n, wikiTitle });
			continue;
		}
		const safe = canonicalIconFilename(image);
		if (!safe) {
			for (const n of names) missingImage.push({ itemName: n, wikiTitle, image });
			continue;
		}
		neededFiles.add(safe);
		for (const n of names) {
			manifest[n] = safe;
		}
	}

	const toDownload = [];
	for (const file of neededFiles) {
		const dest = path.join(iconsDir, file);
		if (!force && fs.existsSync(dest)) {
			continue;
		}
		toDownload.push(file);
	}

	log(`Icônes à télécharger : ${toDownload.length} (déjà présentes : ${neededFiles.size - toDownload.length})`);

	let downloaded = 0;
	let failed = 0;

	if (toDownload.length) {
		const urlByFile = await fetchImageInfoUrls(toDownload, { fetchImpl });
		for (const file of toDownload) {
			const fileUrl = urlByFile.get(mediaWikiFileKey(file));
			const dest = path.join(iconsDir, file);
			if (!fileUrl) {
				log(`[skip] pas d’URL imageinfo pour ${file}`);
				failed++;
				continue;
			}
			if (dryRun) {
				log(`[dry] ${file} ← ${fileUrl}`);
				downloaded++;
				continue;
			}
			try {
				const size = await downloadBinary(fileUrl, dest, { fetchImpl, expectedName: file });
				log(`[ok] ${file} (${size} o)`);
				downloaded++;
			}
			catch (err) {
				log(`[err] ${file}: ${err.message}`);
				failed++;
			}
			await sleep(Math.floor(BATCH_DELAY_MS / 4));
		}
	}

	const manifestPath = path.join(iconsDir, 'manifest.json');
	if (dryRun) {
		log(`[dry] écriture manifest (${Object.keys(manifest).length} entrées) → ${manifestPath}`);
	}
	else {
		fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, '\t')}\n`, 'utf8');
		log(`Manifest écrit : ${Object.keys(manifest).length} entrées`);
	}

	if (missingPages.length) {
		log(`Pages wiki manquantes : ${missingPages.length}`);
	}
	if (missingImage.length) {
		log(`Sans champ image infobox : ${missingImage.length}`);
	}

	return {
		manifest,
		downloaded,
		failed,
		skippedExisting: neededFiles.size - toDownload.length,
		missingPages,
		missingImage,
		publicPrefix: PUBLIC_ICON_PREFIX,
	};
}

module.exports = {
	PUBLIC_ICON_PREFIX,
	MAX_ICON_BYTES,
	ALLOWED_ICON_HOSTS,
	safeIconFilename,
	canonicalIconFilename,
	mediaWikiFileKey,
	isAllowedIconUrl,
	detectImageKind,
	extensionMatchesKind,
	catalogItemNames,
	resolveIconWikiTitle,
	fetchImageInfoUrls,
	downloadBinary,
	runSyncMaterialIcons,
};
