'use strict';

const { WIKI_API, USER_AGENT, BATCH_DELAY_MS } = require('../config/api');
const { resolveWikiTitle } = require('./title-resolver');
const { sleep } = require('./rate-limiter');
const { WikiApiError, WikiCategoryApiError } = require('./errors');

/**
 * @param {import('./rate-limiter').RateLimiter} [rateLimiter]
 * @param {import('./cache').PageCache} [cache]
 */
function createWikiClient({ rateLimiter, cache, fetchImpl } = {}) {
	async function trackedFetch(url, init) {
		if (rateLimiter) {
			await rateLimiter.waitTurn();
		}
		const impl = fetchImpl || fetch;
		return impl(url, init);
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

			const res = await trackedFetch(url, { headers: { 'User-Agent': USER_AGENT } });
			const data = await res.json();
			if (data.error) {
				throw new WikiCategoryApiError(data.error.code, data.error.info);
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
		const uncached = cache ? cache.missingTitles(titles) : titles;
		if (uncached.length === 0) {
			const map = new Map();
			for (const t of titles) {
				map.set(t, cache.get(t));
			}
			return map;
		}

		const url = new URL(WIKI_API);
		url.searchParams.set('action', 'query');
		url.searchParams.set('format', 'json');
		url.searchParams.set('prop', 'revisions');
		url.searchParams.set('rvslots', 'main');
		url.searchParams.set('rvprop', 'content');
		url.searchParams.set('redirects', '1');
		url.searchParams.set('titles', uncached.join('|'));

		const res = await trackedFetch(url, { headers: { 'User-Agent': USER_AGENT } });
		const data = await res.json();
		if (data.error) {
			throw new WikiApiError(data.error.code, data.error.info);
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

		const fetched = new Map();
		for (const requested of uncached) {
			const resolved = resolveWikiTitle(requested, query);
			const content = byResolvedTitle.get(resolved) ?? null;
			fetched.set(requested, content);
			if (cache) {
				cache.set(requested, content);
			}
		}

		if (!cache) {
			return fetched;
		}

		const map = new Map();
		for (const requested of titles) {
			map.set(requested, cache.get(requested));
		}
		return map;
	}

	return {
		fetchCategoryPageTitles,
		fetchWikitextForTitles,
	};
}

const defaultClient = createWikiClient();

module.exports = {
	createWikiClient,
	fetchCategoryPageTitles: defaultClient.fetchCategoryPageTitles,
	fetchWikitextForTitles: defaultClient.fetchWikitextForTitles,
};
