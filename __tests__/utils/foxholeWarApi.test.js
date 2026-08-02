'use strict';

const {
	WARAPI_WAR_URL,
	WARAPI_MAPS_URL,
	STEAM_PLAYERS_URL,
	TTL,
	getWar,
	getSteamPlayers,
	getWarStatusSummary,
	interpolateWarProgress,
	countVictoryTownsOnMap,
	resetCacheForTests,
	expireCacheForTests,
} = require('../../utils/foxholeWarApi');

describe('foxholeWarApi', () => {
	let mockFetch;

	beforeEach(() => {
		resetCacheForTests();
		mockFetch = jest.fn();
		global.fetch = mockFetch;
	});

	function headers(cacheControl = 'max-age=60', etag = '"e1"') {
		return {
			get: (name) => {
				const n = name.toLowerCase();
				if (n === 'cache-control') return cacheControl;
				if (n === 'etag') return etag;
				return null;
			},
		};
	}

	it('interpolates day/hours/minutes/seconds from conquestStartTime', () => {
		const start = Date.UTC(2026, 0, 1, 0, 0, 0);
		const now = start + (2 * 24 + 5) * 60 * 60 * 1000 + 12 * 60 * 1000 + 40 * 1000;
		expect(interpolateWarProgress(start, null, now)).toEqual({
			elapsedMs: now - start,
			dayOfWar: 3,
			days: 2,
			hours: 5,
			minutes: 12,
			seconds: 40,
			ended: false,
		});
	});

	it('countVictoryTownsOnMap counts victory bases by faction', () => {
		expect(countVictoryTownsOnMap({
			mapItems: [
				{ teamId: 'COLONIALS', flags: 1 },
				{ teamId: 'COLONIALS', flags: 1 },
				{ teamId: 'WARDENS', flags: 1 },
				// victory + scorched
				{ teamId: 'WARDENS', flags: 17 },
				{ teamId: 'NONE', flags: 0 },
			],
			scorchedVictoryTowns: 0,
		})).toEqual({ colonial: 2, warden: 1, neutral: 0, scorched: 1 });
	});

	it('getWarStatusSummary returns war + towns + scheduled end', async () => {
		const start = Date.now() - (1 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000);
		const scheduled = Date.now() + 7 * 24 * 60 * 60 * 1000;
		const warPayload = {
			warNumber: 132,
			winner: 'NONE',
			requiredVictoryTowns: 32,
			shortRequiredVictoryTowns: 30,
			conquestStartTime: start,
			conquestEndTime: null,
			scheduledConquestEndTime: scheduled,
		};
		mockFetch.mockImplementation((url) => {
			if (url === WARAPI_WAR_URL) {
				return Promise.resolve({
					ok: true,
					status: 200,
					json: () => Promise.resolve(warPayload),
					headers: headers(),
				});
			}
			if (url === WARAPI_MAPS_URL) {
				return Promise.resolve({
					ok: true,
					status: 200,
					json: () => Promise.resolve(['HexA']),
					headers: headers(),
				});
			}
			if (String(url).includes('/dynamic/public')) {
				return Promise.resolve({
					ok: true,
					status: 200,
					json: () => Promise.resolve({
						mapItems: [
							{ teamId: 'COLONIALS', flags: 1 },
							{ teamId: 'WARDENS', flags: 1 },
							{ teamId: 'WARDENS', flags: 1 },
						],
						scorchedVictoryTowns: 0,
					}),
					headers: headers(),
				});
			}
			if (url === STEAM_PLAYERS_URL) {
				return Promise.resolve({
					ok: true,
					status: 200,
					json: () => Promise.resolve({ response: { player_count: 12000 } }),
					headers: headers(),
				});
			}
			return Promise.resolve({ ok: false, status: 500, headers: headers(null, null) });
		});

		const summary = await getWarStatusSummary();
		expect(summary).toMatchObject({
			available: true,
			warNumber: 132,
			winner: 'NONE',
			ended: false,
			requiredVictoryTowns: 32,
			shortRequiredVictoryTowns: 30,
			effectiveRequiredVictoryTowns: 32,
			playersOnline: 12000,
			scheduledConquestEndTime: scheduled,
			dayOfWar: 2,
			victoryTowns: { colonial: 1, warden: 2, neutral: 0, scorched: 0 },
		});
		expect(summary.elapsed.days).toBe(1);
		expect(summary.elapsed.hours).toBe(2);
		expect(typeof summary.elapsed.seconds).toBe('number');
	});

	it('getWarStatusSummary hides card when war API unavailable', async () => {
		mockFetch.mockResolvedValue({ ok: false, status: 503, headers: headers(null, null) });
		expect(await getWarStatusSummary()).toEqual({ available: false });
	});

	it('marks war ended when winner is set', async () => {
		mockFetch.mockImplementation((url) => {
			if (url === WARAPI_WAR_URL) {
				return Promise.resolve({
					ok: true,
					status: 200,
					json: () => Promise.resolve({
						warNumber: 100,
						winner: 'WARDEN',
						requiredVictoryTowns: 32,
						conquestStartTime: Date.now() - 86400000,
						conquestEndTime: Date.now() - 3600000,
					}),
					headers: headers(),
				});
			}
			if (url === WARAPI_MAPS_URL) {
				return Promise.resolve({
					ok: true,
					status: 200,
					json: () => Promise.resolve([]),
					headers: headers(),
				});
			}
			if (url === STEAM_PLAYERS_URL) {
				return Promise.resolve({
					ok: true,
					status: 200,
					json: () => Promise.resolve({ response: { player_count: 1 } }),
					headers: headers(),
				});
			}
			return Promise.resolve({ ok: false, status: 500, headers: headers(null, null) });
		});
		const summary = await getWarStatusSummary();
		expect(summary.available).toBe(true);
		expect(summary.ended).toBe(true);
		expect(summary.winner).toBe('WARDEN');
	});

	it('getWar caches for 1 day even when API sends max-age=60', async () => {
		expect(TTL.war).toBe(24 * 60 * 60 * 1000);
		mockFetch.mockResolvedValue({
			ok: true,
			status: 200,
			json: () => Promise.resolve({ warNumber: 1, winner: 'NONE' }),
			headers: headers('max-age=60'),
		});
		await getWar();
		await getWar();
		expect(mockFetch).toHaveBeenCalledTimes(1);
	});

	it('revalidates with If-None-Match after TTL expiry', async () => {
		mockFetch
			.mockResolvedValueOnce({
				ok: true,
				status: 200,
				json: () => Promise.resolve({ warNumber: 1, winner: 'NONE' }),
				headers: headers('max-age=60', '"etag-a"'),
			})
			.mockResolvedValueOnce({
				ok: true,
				status: 304,
				headers: headers('max-age=60', '"etag-a"'),
			});

		await getWar();
		expireCacheForTests('war');
		const again = await getWar();
		expect(again.warNumber).toBe(1);
		expect(mockFetch).toHaveBeenNthCalledWith(2, WARAPI_WAR_URL, expect.objectContaining({
			headers: expect.objectContaining({ 'If-None-Match': '"etag-a"' }),
		}));
	});

	it('getSteamPlayers reads player_count', async () => {
		mockFetch.mockResolvedValue({
			ok: true,
			status: 200,
			json: () => Promise.resolve({ response: { player_count: 42 } }),
			headers: headers(),
		});
		const data = await getSteamPlayers();
		expect(data.response.player_count).toBe(42);
	});
});
