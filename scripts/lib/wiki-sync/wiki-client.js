'use strict';

const {
	WIKI_API,
	USER_AGENT,
	BATCH_DELAY_MS,
} = require('./config');
const { sleep } = require('./wiki-helpers');

function resolveWikiTitle(requestedTitle, query) {
	let cur = requestedTitle;
	let changed = true;
	while (changed) {
		changed = false;
		for (const n of query.normalized || []) {
			if (n.from === cur) {
				cur = n.to;
				changed = true;
				break;
			}
		}
		for (const r of query.redirects || []) {
			if (r.from === cur) {
				cur = r.to;
				changed = true;
				break;
			}
		}
	}
	return cur;
}

async function fetchCategoryPageTitles(cmtitle) {
	const titles = new Set();
	let cmcontinue = null;
	do {
		const url = new URL(WIKI_API);
		url.searchParams.set('action', 'query');
		url.searchParams.set('format', 'json');
		url.searchParams.set('list', 'categorymembers');
		url.searchParams.set('cmtitle', cmtitle);
		url.searchParams.set('cmtype', 'page');
		url.searchParams.set('cmlimit', '500');
		if (cmcontinue) {
			url.searchParams.set('cmcontinue', cmcontinue);
		}

		const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
		const data = await res.json();
		if (data.error) {
			throw new Error(`API categorymembers: ${data.error.code} — ${data.error.info}`);
		}
		for (const m of data.query?.categorymembers || []) {
			if (m.ns === 0) {
				titles.add(m.title);
			}
		}
		cmcontinue = data.continue?.cmcontinue;
		if (cmcontinue) {
			await sleep(Math.floor(BATCH_DELAY_MS / 2));
		}
	} while (cmcontinue);
	return titles;
}

async function fetchWikitextForTitles(titles) {
	const url = new URL(WIKI_API);
	url.searchParams.set('action', 'query');
	url.searchParams.set('format', 'json');
	url.searchParams.set('prop', 'revisions');
	url.searchParams.set('rvslots', 'main');
	url.searchParams.set('rvprop', 'content');
	url.searchParams.set('redirects', '1');
	url.searchParams.set('titles', titles.join('|'));

	const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
	const data = await res.json();
	if (data.error) {
		throw new Error(`API: ${data.error.code} — ${data.error.info}`);
	}

	const query = data.query || {};
	const byResolvedTitle = new Map();
	const pages = query.pages || {};
	for (const page of Object.values(pages)) {
		if (page.missing !== undefined || page.invalid !== undefined) {
			byResolvedTitle.set(page.title, null);
			continue;
		}
		const slot = page.revisions?.[0]?.slots?.main;
		const content = slot?.['*'];
		byResolvedTitle.set(page.title, content ?? null);
	}

	const map = new Map();
	for (const requested of titles) {
		const resolved = resolveWikiTitle(requested, query);
		map.set(requested, byResolvedTitle.get(resolved) ?? null);
	}
	return map;
}

module.exports = {
	fetchCategoryPageTitles,
	fetchWikitextForTitles,
};
