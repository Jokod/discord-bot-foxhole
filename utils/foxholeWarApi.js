'use strict';

/**
 * Foxhole War API + Steam players (shared by /war slash and dashboard).
 * War payload is cached 1 day — elapsed day/time is interpolated from conquestStartTime.
 */

const { interpolateWarProgress } = require('../shared/warProgress');

const WARAPI_ROOT = 'https://war-service-live.foxholeservices.com/api';
const WARAPI_WAR_URL = `${WARAPI_ROOT}/worldconquest/war`;
const WARAPI_MAPS_URL = `${WARAPI_ROOT}/worldconquest/maps`;
const STEAM_PLAYERS_URL = 'https://api.steampowered.com/ISteamUserStats/GetNumberOfCurrentPlayers/v1/?appid=505460';
const FETCH_TIMEOUT_MS = 8000;

const DAY_MS = 24 * 60 * 60 * 1000;

const TTL = {
	/** War metadata barely moves; refresh at most once per day (ignore short API max-age). */
	war: DAY_MS,
	maps: DAY_MS,
	report: 5 * 60_000,
	/** Victory-town ownership changes more often. */
	victory: 60 * 60_000,
	/** Players online changes more often. */
	steam: 5 * 60_000,
};

const FLAG_VICTORY_BASE = 1;
const FLAG_SCORCHED = 16;

const cache = {
	war: { data: null, etag: null, expiresAt: 0 },
	maps: { data: null, etag: null, expiresAt: 0 },
	steam: { data: null, expiresAt: 0 },
	victory: { data: null, expiresAt: 0 },
	reports: new Map(),
};

function parseMaxAge(cacheControl) {
	if (!cacheControl) return null;
	const match = String(cacheControl).match(/max-age=(\d+)/);
	if (!match) return null;
	return Number(match[1]) * 1000;
}

async function fetchWithTimeout(url, options = {}) {
	const controller = new AbortController();
	const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
	try {
		const res = await fetch(url, { ...options, signal: controller.signal });
		clearTimeout(timeoutId);
		return res;
	}
	catch {
		clearTimeout(timeoutId);
		return null;
	}
}

async function getWar() {
	const now = Date.now();
	if (cache.war.data && now < cache.war.expiresAt) return cache.war.data;

	const headers = {};
	if (cache.war.etag) headers['If-None-Match'] = cache.war.etag;

	const res = await fetchWithTimeout(WARAPI_WAR_URL, { headers });
	if (!res) return cache.war.data;

	if (res.status === 304 && cache.war.data) {
		cache.war.expiresAt = now + TTL.war;
		return cache.war.data;
	}

	if (!res.ok) return cache.war.data;

	const data = await res.json().catch(() => null);
	if (!data) return cache.war.data;

	cache.war = {
		data,
		etag: res.headers.get('etag') || cache.war.etag,
		expiresAt: now + TTL.war,
	};
	return data;
}

async function getMaps() {
	const now = Date.now();
	if (cache.maps.data && now < cache.maps.expiresAt) return cache.maps.data;

	const headers = {};
	if (cache.maps.etag) headers['If-None-Match'] = cache.maps.etag;

	const res = await fetchWithTimeout(WARAPI_MAPS_URL, { headers });
	if (!res) return cache.maps.data;

	if (res.status === 304 && cache.maps.data) {
		cache.maps.expiresAt = now + TTL.maps;
		return cache.maps.data;
	}

	if (!res.ok) return cache.maps.data;

	const data = await res.json().catch(() => null);
	if (!data) return cache.maps.data;

	cache.maps = {
		data,
		etag: res.headers.get('etag') || cache.maps.etag,
		expiresAt: now + TTL.maps,
	};
	return data;
}

async function getSteamPlayers() {
	const now = Date.now();
	if (cache.steam.data && now < cache.steam.expiresAt) return cache.steam.data;

	const res = await fetchWithTimeout(STEAM_PLAYERS_URL);
	if (!res || !res.ok) return cache.steam.data;

	const data = await res.json().catch(() => null);
	if (!data) return cache.steam.data;

	cache.steam = { data, expiresAt: now + TTL.steam };
	return data;
}

async function getWarReport(mapName) {
	const key = String(mapName).toLowerCase();
	const now = Date.now();
	const cached = cache.reports.get(key) || { data: null, etag: null, expiresAt: 0 };

	if (cached.data && now < cached.expiresAt) return cached.data;

	const headers = {};
	if (cached.etag) headers['If-None-Match'] = cached.etag;

	const url = `${WARAPI_ROOT}/worldconquest/warReport/${encodeURIComponent(mapName)}`;
	const res = await fetchWithTimeout(url, { headers });
	if (!res) return cached.data;

	if (res.status === 304 && cached.data) {
		cached.expiresAt = now + (parseMaxAge(res.headers.get('cache-control')) ?? TTL.report);
		cache.reports.set(key, cached);
		return cached.data;
	}

	if (!res.ok) return cached.data;

	const data = await res.json().catch(() => null);
	if (!data) return cached.data;

	const updated = {
		data,
		etag: res.headers.get('etag') || cached.etag,
		expiresAt: now + (parseMaxAge(res.headers.get('cache-control')) ?? TTL.report),
	};
	cache.reports.set(key, updated);
	return data;
}

function countVictoryTownsOnMap(dyn) {
	let colonial = 0;
	let warden = 0;
	let neutral = 0;
	let scorched = 0;
	for (const it of dyn?.mapItems || []) {
		const flags = Number(it.flags) || 0;
		if ((flags & FLAG_VICTORY_BASE) === 0) continue;
		if ((flags & FLAG_SCORCHED) !== 0) {
			scorched += 1;
			continue;
		}
		const team = String(it.teamId || 'NONE').toUpperCase();
		if (team === 'COLONIALS' || team === 'COLONIAL') colonial += 1;
		else if (team === 'WARDENS' || team === 'WARDEN') warden += 1;
		else neutral += 1;
	}
	if (!scorched && typeof dyn?.scorchedVictoryTowns === 'number') {
		scorched = dyn.scorchedVictoryTowns;
	}
	return { colonial, warden, neutral, scorched };
}

async function fetchMapDynamic(mapName) {
	const url = `${WARAPI_ROOT}/worldconquest/maps/${encodeURIComponent(mapName)}/dynamic/public`;
	const res = await fetchWithTimeout(url);
	if (!res || !res.ok) return null;
	return res.json().catch(() => null);
}

/** Aggregate victory-base ownership across all maps (cached ~1h). */
async function getVictoryTownCounts() {
	const now = Date.now();
	if (cache.victory.data && now < cache.victory.expiresAt) return cache.victory.data;

	const maps = await getMaps();
	if (!Array.isArray(maps) || maps.length === 0) return cache.victory.data;

	const totals = { colonial: 0, warden: 0, neutral: 0, scorched: 0, mapsCounted: 0 };
	const dynamics = await Promise.all(maps.map((name) => fetchMapDynamic(name)));
	for (const dyn of dynamics) {
		if (!dyn) continue;
		const part = countVictoryTownsOnMap(dyn);
		totals.colonial += part.colonial;
		totals.warden += part.warden;
		totals.neutral += part.neutral;
		totals.scorched += part.scorched;
		totals.mapsCounted += 1;
	}

	if (totals.mapsCounted === 0) return cache.victory.data;

	cache.victory = { data: totals, expiresAt: now + TTL.victory };
	return totals;
}

function isWarEnded(warData, progress) {
	if (!warData) return false;
	const winner = warData.winner || 'NONE';
	if (winner !== 'NONE') return true;
	if (progress?.ended) return true;
	if (warData.conquestEndTime && Number(warData.conquestEndTime) > 0) return true;
	return false;
}

/** Shape for dashboard `/api/summary` (no secrets, safe to expose to authenticated admins). */
async function getWarStatusSummary() {
	const warData = await getWar();
	const hasWar = warData && typeof warData.warNumber === 'number';
	if (!hasWar) {
		return { available: false };
	}

	const [steamData, victory] = await Promise.all([
		getSteamPlayers(),
		getVictoryTownCounts(),
	]);
	const playersOnline = steamData?.response?.player_count;
	const hasPlayers = typeof playersOnline === 'number';

	const start = warData.conquestStartTime || null;
	const end = warData.conquestEndTime || null;
	const scheduledEnd = warData.scheduledConquestEndTime || null;
	const progress = interpolateWarProgress(start, end);
	const ended = isWarEnded(warData, progress);
	const required = warData.requiredVictoryTowns ?? null;
	const shortRequired = warData.shortRequiredVictoryTowns ?? null;
	const effectiveRequired = required != null && victory
		? Math.max(0, required - (victory.scorched || 0))
		: required;

	return {
		available: true,
		warNumber: warData.warNumber,
		winner: warData.winner || 'NONE',
		ended,
		requiredVictoryTowns: required,
		shortRequiredVictoryTowns: shortRequired,
		effectiveRequiredVictoryTowns: effectiveRequired,
		conquestStartTime: start,
		conquestEndTime: end,
		scheduledConquestEndTime: scheduledEnd,
		playersOnline: hasPlayers ? playersOnline : null,
		dayOfWar: progress.dayOfWar,
		elapsed: {
			days: progress.days,
			hours: progress.hours,
			minutes: progress.minutes,
			seconds: progress.seconds,
			ended: progress.ended,
		},
		victoryTowns: victory
			? {
				colonial: victory.colonial,
				warden: victory.warden,
				neutral: victory.neutral,
				scorched: victory.scorched,
			}
			: null,
		cachedUntil: cache.war.expiresAt || null,
	};
}

function resetCacheForTests() {
	cache.war = { data: null, etag: null, expiresAt: 0 };
	cache.maps = { data: null, etag: null, expiresAt: 0 };
	cache.steam = { data: null, expiresAt: 0 };
	cache.victory = { data: null, expiresAt: 0 };
	cache.reports.clear();
}

/** Keep payload/etag but force a network revalidation on next get*. */
function expireCacheForTests(kind = 'all') {
	if (kind === 'all' || kind === 'war') cache.war.expiresAt = 0;
	if (kind === 'all' || kind === 'maps') cache.maps.expiresAt = 0;
	if (kind === 'all' || kind === 'steam') cache.steam.expiresAt = 0;
	if (kind === 'all' || kind === 'victory') cache.victory.expiresAt = 0;
	if (kind === 'all' || kind === 'reports') {
		for (const entry of cache.reports.values()) entry.expiresAt = 0;
	}
}

module.exports = {
	WARAPI_ROOT,
	WARAPI_WAR_URL,
	WARAPI_MAPS_URL,
	STEAM_PLAYERS_URL,
	TTL,
	FLAG_VICTORY_BASE,
	FLAG_SCORCHED,
	parseMaxAge,
	getWar,
	getMaps,
	getSteamPlayers,
	getWarReport,
	getVictoryTownCounts,
	isWarEnded,
	getWarStatusSummary,
	interpolateWarProgress,
	countVictoryTownsOnMap,
	resetCacheForTests,
	expireCacheForTests,
};
