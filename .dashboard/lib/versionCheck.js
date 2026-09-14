'use strict';

const rootPkg = require('../../package.json');

const CACHE_TTL_MS = 60 * 60 * 1000;

/** @type {{ at: number, payload: object } | null} */
let cache = null;

function getLocalVersion(pkg = rootPkg) {
	return String(pkg?.version || '').trim();
}

function normalizeVersion(raw) {
	return String(raw || '').trim().replace(/^v/i, '');
}

function parseGithubRepo(githubUrl) {
	const raw = String(githubUrl || '').trim();
	if (!raw) return null;
	try {
		const u = new URL(raw);
		if (u.hostname !== 'github.com' && u.hostname !== 'www.github.com') return null;
		const parts = u.pathname.replace(/^\/+|\/+$/g, '').split('/');
		if (parts.length < 2 || !parts[0] || !parts[1]) return null;
		return { owner: parts[0], repo: parts[1].replace(/\.git$/i, '') };
	}
	catch {
		return null;
	}
}

function compareSemver(a, b) {
	const pa = normalizeVersion(a).split('.').map((n) => parseInt(n, 10) || 0);
	const pb = normalizeVersion(b).split('.').map((n) => parseInt(n, 10) || 0);
	const len = Math.max(pa.length, pb.length);
	for (let i = 0; i < len; i++) {
		const x = pa[i] || 0;
		const y = pb[i] || 0;
		if (x > y) return 1;
		if (x < y) return -1;
	}
	return 0;
}

function noUpdate(local) {
	return {
		local,
		latest: null,
		updateAvailable: false,
		releaseUrl: null,
	};
}

/**
 * @param {object} [opts]
 * @param {string} [opts.githubUrl]
 * @param {typeof fetch} [opts.fetchFn]
 * @param {() => number} [opts.now]
 * @param {number} [opts.cacheTtlMs]
 * @param {object} [opts.pkg]
 */
async function getVersionStatus(opts = {}) {
	const local = getLocalVersion(opts.pkg);
	const githubUrl = opts.githubUrl ?? process.env.GITHUB_URL;
	const fetchFn = opts.fetchFn || globalThis.fetch;
	const now = opts.now || Date.now;
	const ttl = opts.cacheTtlMs ?? CACHE_TTL_MS;

	if (!local) return noUpdate('');

	if (cache && (now() - cache.at) < ttl) {
		return { ...cache.payload, local };
	}

	const repo = parseGithubRepo(githubUrl);
	if (!repo || typeof fetchFn !== 'function') {
		return noUpdate(local);
	}

	try {
		const url = `https://api.github.com/repos/${repo.owner}/${repo.repo}/releases/latest`;
		const res = await fetchFn(url, {
			headers: {
				Accept: 'application/vnd.github+json',
				'User-Agent': 'FoxBot-Dashboard',
			},
		});
		if (!res.ok) return noUpdate(local);
		const data = await res.json();
		const tag = normalizeVersion(data.tag_name || data.name);
		if (!tag) return noUpdate(local);
		const releaseUrl = typeof data.html_url === 'string' && data.html_url
			? data.html_url
			: `https://github.com/${repo.owner}/${repo.repo}/releases/tag/${data.tag_name || tag}`;
		const payload = {
			local,
			latest: tag,
			updateAvailable: compareSemver(tag, local) > 0,
			releaseUrl,
		};
		cache = { at: now(), payload };
		return payload;
	}
	catch {
		return noUpdate(local);
	}
}

function resetVersionCacheForTests() {
	cache = null;
}

module.exports = {
	CACHE_TTL_MS,
	getLocalVersion,
	normalizeVersion,
	parseGithubRepo,
	compareSemver,
	getVersionStatus,
	resetVersionCacheForTests,
};
