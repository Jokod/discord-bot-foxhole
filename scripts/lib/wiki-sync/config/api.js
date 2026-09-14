'use strict';

function envInt(name, fallback) {
	const raw = process.env[name];
	if (raw === undefined || raw === '') {
		return fallback;
	}
	const n = Number(raw);
	return Number.isFinite(n) && n >= 0 ? Math.floor(n) : fallback;
}

const WIKI_API = 'https://foxhole.wiki.gg/api.php';
const USER_AGENT = 'FoxBot/1.0 (Discord bot; github; Foxhole materials sync; non-commercial)';
const BATCH_SIZE = 40;

const BATCH_DELAY_MS = envInt('WIKI_SYNC_BATCH_DELAY_MS', 2000);
const MIN_INTERVAL_MS = envInt('WIKI_SYNC_MIN_INTERVAL_MS', 0);
const CONCURRENCY = Math.max(1, envInt('WIKI_SYNC_CONCURRENCY', 1));
const MAX_REQUESTS_PER_RUN = envInt('WIKI_SYNC_MAX_REQUESTS_PER_RUN', Number.MAX_SAFE_INTEGER);

module.exports = {
	WIKI_API,
	USER_AGENT,
	BATCH_SIZE,
	BATCH_DELAY_MS,
	MIN_INTERVAL_MS,
	CONCURRENCY,
	MAX_REQUESTS_PER_RUN,
};
