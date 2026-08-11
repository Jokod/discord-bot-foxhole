'use strict';

const {
	WARAPI_WAR_URL,
	WARAPI_MAPS_URL,
	STEAM_PLAYERS_URL,
	TTL,
	parseMaxAge,
	getWar,
	getMaps,
	getSteamPlayers,
	getWarReport,
	getVictoryTownCounts,
	getWarStatusSummary,
	interpolateWarProgress,
	countVictoryTownsOnMap,
	resetCacheForTests,
	expireCacheForTests,
	isWarEnded,
} = require('../../utils/foxholeWarApi');

describe('foxholeWarApi', () => {
	let mockFetch;

	beforeEach(() => {
		resetCacheForTests();
		mockFetch = jest.fn();
		global.fetch = mockFetch;
	});

	it('parseMaxAge convertit max-age en millisecondes', () => {
		expect(parseMaxAge('max-age=120')).toBe(120000);
		expect(parseMaxAge('public, max-age=60')).toBe(60000);
		expect(parseMaxAge(null)).toBeNull();
		expect(parseMaxAge('no-cache')).toBeNull();
		expect(parseMaxAge('max-age=abc')).toBeNull();
	});

	it('isWarEnded gère warData absent et winner', () => {
		expect(isWarEnded(null)).toBe(false);
		expect(isWarEnded(undefined)).toBe(false);
		expect(isWarEnded({ winner: 'COLONIAL' })).toBe(true);
		expect(isWarEnded({ winner: 'NONE' }, { ended: true })).toBe(true);
		expect(isWarEnded({ winner: 'NONE', conquestEndTime: 1 })).toBe(true);
		expect(isWarEnded({ winner: 'NONE' })).toBe(false);
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

	it('countVictoryTownsOnMap compte COLONIAL, WARDEN, neutral et scorched fallback', () => {
		expect(countVictoryTownsOnMap({
			mapItems: [
				{ teamId: 'COLONIAL', flags: 1 },
				{ teamId: 'WARDEN', flags: 1 },
				{ teamId: 'NONE', flags: 1 },
			],
			scorchedVictoryTowns: 2,
		})).toEqual({ colonial: 1, warden: 1, neutral: 1, scorched: 2 });
	});

	it('countVictoryTownsOnMap ignore items sans flag victory', () => {
		expect(countVictoryTownsOnMap({ mapItems: [{ teamId: 'WARDENS', flags: 0 }] }))
			.toEqual({ colonial: 0, warden: 0, neutral: 0, scorched: 0 });
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

	it('getMaps cache et 304', async () => {
		mockFetch
			.mockResolvedValueOnce({
				ok: true,
				status: 200,
				json: () => Promise.resolve(['MapA']),
				headers: headers('max-age=60', '"maps-1"'),
			})
			.mockResolvedValueOnce({
				ok: true,
				status: 304,
				headers: headers('max-age=60', '"maps-1"'),
			});
		await getMaps();
		expireCacheForTests('maps');
		const again = await getMaps();
		expect(again).toEqual(['MapA']);
		expect(mockFetch).toHaveBeenCalledTimes(2);
	});

	it('getWarReport utilise cache-control max-age et 304', async () => {
		mockFetch
			.mockResolvedValueOnce({
				ok: true,
				status: 200,
				json: () => Promise.resolve({ items: 1 }),
				headers: headers('max-age=120', '"rep-1"'),
			})
			.mockResolvedValueOnce({
				ok: true,
				status: 304,
				headers: headers('max-age=120', '"rep-1"'),
			});
		const first = await getWarReport('HexA');
		expect(first).toEqual({ items: 1 });
		expireCacheForTests('reports');
		const second = await getWarReport('HexA');
		expect(second).toEqual({ items: 1 });
		expect(mockFetch).toHaveBeenCalledTimes(2);
	});

	it('getWarReport retourne cache si fetch échoue', async () => {
		mockFetch
			.mockResolvedValueOnce({
				ok: true,
				status: 200,
				json: () => Promise.resolve({ cached: true }),
				headers: headers(),
			})
			.mockImplementationOnce(() => { throw new Error('network'); });
		await getWarReport('HexB');
		expireCacheForTests('reports');
		const again = await getWarReport('HexB');
		expect(again).toEqual({ cached: true });
	});

	it('getVictoryTownCounts agrège les maps dynamiques', async () => {
		mockFetch.mockImplementation((url) => {
			if (url === WARAPI_MAPS_URL) {
				return Promise.resolve({
					ok: true,
					status: 200,
					json: () => Promise.resolve(['A', 'B']),
					headers: headers(),
				});
			}
			if (String(url).includes('/dynamic/public')) {
				const map = String(url).includes('/A/') ? 'A' : 'B';
				if (map === 'A') {
					return Promise.resolve({
						ok: true,
						status: 200,
						json: () => Promise.resolve({
							mapItems: [{ teamId: 'COLONIALS', flags: 1 }],
							scorchedVictoryTowns: 0,
						}),
						headers: headers(),
					});
				}
				return Promise.resolve({ ok: false, status: 404, headers: headers() });
			}
			return Promise.resolve({ ok: false, status: 500, headers: headers() });
		});
		const totals = await getVictoryTownCounts();
		expect(totals).toMatchObject({ colonial: 1, mapsCounted: 1 });
	});

	it('getVictoryTownCounts retourne cache si maps vides', async () => {
		mockFetch.mockResolvedValue({
			ok: true,
			status: 200,
			json: () => Promise.resolve([]),
			headers: headers(),
		});
		expect(await getVictoryTownCounts()).toBeNull();
	});

	it('getWar retourne cache stale si fetch timeout', async () => {
		mockFetch
			.mockResolvedValueOnce({
				ok: true,
				status: 200,
				json: () => Promise.resolve({ warNumber: 9, winner: 'NONE' }),
				headers: headers(),
			})
			.mockImplementationOnce(() => { throw new Error('abort'); });
		await getWar();
		expireCacheForTests('war');
		const again = await getWar();
		expect(again.warNumber).toBe(9);
	});

	it('getWarStatusSummary effectiveRequired soustrait scorched', async () => {
		mockFetch.mockImplementation((url) => {
			if (url === WARAPI_WAR_URL) {
				return Promise.resolve({
					ok: true,
					status: 200,
					json: () => Promise.resolve({
						warNumber: 1,
						winner: 'NONE',
						requiredVictoryTowns: 32,
						conquestStartTime: Date.now() - 86400000,
					}),
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
						mapItems: [{ teamId: 'WARDENS', flags: 17 }],
						scorchedVictoryTowns: 0,
					}),
					headers: headers(),
				});
			}
			if (url === STEAM_PLAYERS_URL) {
				return Promise.resolve({
					ok: true,
					status: 200,
					json: () => Promise.resolve({ response: {} }),
					headers: headers(),
				});
			}
			return Promise.resolve({ ok: false, status: 500, headers: headers() });
		});
		const summary = await getWarStatusSummary();
		expect(summary.playersOnline).toBeNull();
		expect(summary.effectiveRequiredVictoryTowns).toBe(31);
		expect(summary.victoryTowns.scorched).toBe(1);
	});

	it('getWarStatusSummary ended via conquestEndTime', async () => {
		mockFetch.mockImplementation((url) => {
			if (url === WARAPI_WAR_URL) {
				return Promise.resolve({
					ok: true,
					status: 200,
					json: () => Promise.resolve({
						warNumber: 1,
						winner: 'NONE',
						conquestStartTime: Date.now() - 86400000 * 3,
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
			return Promise.resolve({ ok: false, status: 500, headers: headers() });
		});
		const summary = await getWarStatusSummary();
		expect(summary.ended).toBe(true);
	});

	it('expireCacheForTests all kinds', async () => {
		mockFetch.mockResolvedValue({
			ok: true,
			status: 200,
			json: () => Promise.resolve({ warNumber: 1, winner: 'NONE' }),
			headers: headers(),
		});
		await getWar();
		await getMaps();
		await getSteamPlayers();
		expireCacheForTests('all');
		await getWar();
		expect(mockFetch.mock.calls.length).toBeGreaterThan(3);
	});

	it('parseMaxAge via getWarReport sans cache-control utilise TTL.report', async () => {
		mockFetch.mockResolvedValue({
			ok: true,
			status: 200,
			json: () => Promise.resolve({ ok: 1 }),
			headers: {
				get: (name) => (name.toLowerCase() === 'etag' ? '"r2"' : null),
			},
		});
		await getWarReport('NoCache');
		expireCacheForTests('reports');
		await getWarReport('NoCache');
		expect(mockFetch).toHaveBeenCalledTimes(2);
	});

	it('getWar/getMaps/getSteamPlayers retournent null si json invalide', async () => {
		mockFetch.mockResolvedValue({
			ok: true,
			status: 200,
			json: () => Promise.reject(new Error('bad json')),
			headers: headers(),
		});
		expect(await getWar()).toBeNull();
		expect(await getMaps()).toBeNull();
		expect(await getSteamPlayers()).toBeNull();
	});

	it('getWarStatusSummary ended via progress sans winner', async () => {
		const end = Date.now() - 1000;
		const start = end - 86400000;
		mockFetch.mockImplementation((url) => {
			if (url === WARAPI_WAR_URL) {
				return Promise.resolve({
					ok: true,
					status: 200,
					json: () => Promise.resolve({
						warNumber: 1,
						winner: 'NONE',
						conquestStartTime: start,
						conquestEndTime: end,
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
			return Promise.resolve({ ok: false, status: 500, headers: headers() });
		});
		const summary = await getWarStatusSummary();
		expect(summary.ended).toBe(true);
	});

	it('parseMaxAge retourne null sans max-age ou valeur invalide', async () => {
		mockFetch
			.mockResolvedValueOnce({
				ok: true,
				status: 200,
				json: () => Promise.resolve({ ok: 1 }),
				headers: { get: (name) => (name.toLowerCase() === 'etag' ? '"x"' : 'no-store') },
			})
			.mockResolvedValueOnce({
				ok: true,
				status: 304,
				headers: { get: (name) => (name.toLowerCase() === 'cache-control' ? 'max-age=not-a-number' : '"x"') },
			});
		await getWarReport('BadAge');
		expireCacheForTests('reports');
		await getWarReport('BadAge');
		expect(mockFetch).toHaveBeenCalledTimes(2);
	});

	it('getWar 304 sans cache existant continue vers not ok', async () => {
		mockFetch.mockResolvedValue({
			ok: false,
			status: 304,
			headers: headers(),
		});
		expect(await getWar()).toBeNull();
	});

	it('getMaps 304 sans cache existant', async () => {
		mockFetch.mockResolvedValue({
			ok: false,
			status: 304,
			headers: headers(),
		});
		expect(await getMaps()).toBeNull();
	});

	it('getVictoryTownCounts retourne cache stale si toutes les maps dynamiques échouent', async () => {
		mockFetch.mockImplementation((url) => {
			if (url === WARAPI_MAPS_URL) {
				return Promise.resolve({
					ok: true,
					status: 200,
					json: () => Promise.resolve(['MapA']),
					headers: headers(),
				});
			}
			if (String(url).includes('/dynamic/public')) {
				return Promise.resolve({
					ok: true,
					status: 200,
					json: () => Promise.resolve({
						mapItems: [{ teamId: 'COLONIALS', flags: 1 }],
						scorchedVictoryTowns: 0,
					}),
					headers: headers(),
				});
			}
			return Promise.resolve({ ok: false, status: 404, headers: headers() });
		});
		const seeded = await getVictoryTownCounts();
		expect(seeded).toMatchObject({ colonial: 1, mapsCounted: 1 });

		expireCacheForTests('victory');
		mockFetch.mockImplementation((url) => {
			if (url === WARAPI_MAPS_URL) {
				return Promise.resolve({
					ok: true,
					status: 200,
					json: () => Promise.resolve(['MapA', 'MapB']),
					headers: headers(),
				});
			}
			return Promise.resolve({ ok: false, status: 404, headers: headers() });
		});
		const stale = await getVictoryTownCounts();
		expect(stale).toEqual(seeded);
	});

	it('expireCacheForTests par kind steam et victory', async () => {
		mockFetch.mockResolvedValue({
			ok: true,
			status: 200,
			json: () => Promise.resolve({ response: { player_count: 1 } }),
			headers: headers(),
		});
		await getSteamPlayers();
		expireCacheForTests('steam');
		await getSteamPlayers();
		expect(mockFetch).toHaveBeenCalledTimes(2);
	});

	it('countVictoryTownsOnMap compte alias COLONIAL et WARDEN', () => {
		const totals = countVictoryTownsOnMap({
			mapItems: [
				{ teamId: 'COLONIAL', flags: 1 },
				{ teamId: 'WARDEN', flags: 1 },
			],
			scorchedVictoryTowns: 0,
		});
		expect(totals).toMatchObject({ colonial: 1, warden: 1 });
	});

	it('fetchWithTimeout abort après timeout sans cache', async () => {
		jest.useFakeTimers();
		mockFetch.mockImplementation((_url, { signal }) => new Promise((_, reject) => {
			signal.addEventListener('abort', () => reject(Object.assign(new Error('Aborted'), { name: 'AbortError' })));
		}));
		const p = getWar();
		await jest.advanceTimersByTimeAsync(8001);
		await expect(p).resolves.toBeNull();
		jest.useRealTimers();
	});

	it('getWarReport json invalide retourne cache existant', async () => {
		mockFetch
			.mockResolvedValueOnce({
				ok: true,
				status: 200,
				json: () => Promise.resolve({ ok: 1 }),
				headers: headers(),
			})
			.mockResolvedValueOnce({
				ok: true,
				status: 200,
				json: () => Promise.reject(new Error('bad json')),
				headers: headers(),
			});
		await getWarReport('HexJson');
		expireCacheForTests('reports');
		await expect(getWarReport('HexJson')).resolves.toEqual({ ok: 1 });
	});

	it('getWar conserve etag cache si réponse sans etag', async () => {
		mockFetch
			.mockResolvedValueOnce({
				ok: true,
				status: 200,
				json: () => Promise.resolve({ warNumber: 1, winner: 'NONE' }),
				headers: headers('max-age=60', '"etag-keep"'),
			})
			.mockResolvedValueOnce({
				ok: true,
				status: 200,
				json: () => Promise.resolve({ warNumber: 2, winner: 'NONE' }),
				headers: { get: () => null },
			});
		await getWar();
		expireCacheForTests('war');
		const again = await getWar();
		expect(again.warNumber).toBe(2);
	});

	it('fetchMapDynamic json invalide retourne null', async () => {
		mockFetch.mockImplementation((url) => {
			if (url === WARAPI_MAPS_URL) {
				return Promise.resolve({
					ok: true,
					status: 200,
					json: () => Promise.resolve(['MapOnly']),
					headers: headers(),
				});
			}
			if (String(url).includes('/dynamic/public')) {
				return Promise.resolve({
					ok: true,
					status: 200,
					json: () => Promise.reject(new Error('bad dynamic json')),
					headers: headers(),
				});
			}
			return Promise.resolve({ ok: false, status: 500, headers: headers() });
		});
		const totals = await getVictoryTownCounts();
		expect(totals).toBeNull();
	});

	it('getWarStatusSummary sans victory data', async () => {
		mockFetch.mockImplementation((url) => {
			if (url === WARAPI_WAR_URL) {
				return Promise.resolve({
					ok: true,
					status: 200,
					json: () => Promise.resolve({
						warNumber: 1,
						winner: 'NONE',
						requiredVictoryTowns: 32,
						conquestStartTime: Date.now() - 86400000,
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
					json: () => Promise.resolve({ response: { player_count: 5 } }),
					headers: headers(),
				});
			}
			return Promise.resolve({ ok: false, status: 500, headers: headers() });
		});
		const summary = await getWarStatusSummary();
		expect(summary.victoryTowns).toBeNull();
		expect(summary.effectiveRequiredVictoryTowns).toBe(32);
	});

	it('parseMaxAge retourne null sans cache-control', async () => {
		mockFetch.mockResolvedValue({
			ok: true,
			status: 200,
			json: () => Promise.resolve({ ok: 1 }),
			headers: { get: () => null },
		});
		await getWarReport('NoHeader');
		expireCacheForTests('reports');
		await getWarReport('NoHeader');
		expect(mockFetch).toHaveBeenCalledTimes(2);
	});

	it('getMaps retourne cache stale si fetch null', async () => {
		mockFetch
			.mockResolvedValueOnce({
				ok: true,
				status: 200,
				json: () => Promise.resolve(['CachedMap']),
				headers: headers('max-age=60', '"maps-e"'),
			})
			.mockImplementationOnce(() => { throw new Error('abort'); });
		await getMaps();
		expireCacheForTests('maps');
		await expect(getMaps()).resolves.toEqual(['CachedMap']);
	});

	it('getMaps conserve etag si réponse sans etag', async () => {
		mockFetch
			.mockResolvedValueOnce({
				ok: true,
				status: 200,
				json: () => Promise.resolve(['A']),
				headers: headers('max-age=60', '"keep-maps"'),
			})
			.mockResolvedValueOnce({
				ok: true,
				status: 200,
				json: () => Promise.resolve(['B']),
				headers: { get: () => null },
			});
		await getMaps();
		expireCacheForTests('maps');
		await expect(getMaps()).resolves.toEqual(['B']);
	});

	it('getWarReport retourne cache si fetch null avec entrée existante', async () => {
		mockFetch
			.mockResolvedValueOnce({
				ok: true,
				status: 200,
				json: () => Promise.resolve({ cached: true }),
				headers: headers('max-age=60', '"rep-cache"'),
			})
			.mockImplementationOnce(() => { throw new Error('down'); });
		await getWarReport('HexCache');
		expireCacheForTests('reports');
		await expect(getWarReport('HexCache')).resolves.toEqual({ cached: true });
	});

	it('getVictoryTownCounts utilise le cache sans refetch', async () => {
		mockFetch.mockImplementation((url) => {
			if (url === WARAPI_MAPS_URL) {
				return Promise.resolve({
					ok: true,
					status: 200,
					json: () => Promise.resolve(['MapA']),
					headers: headers(),
				});
			}
			if (String(url).includes('/dynamic/public')) {
				return Promise.resolve({
					ok: true,
					status: 200,
					json: () => Promise.resolve({
						mapItems: [{ teamId: 'COLONIALS', flags: 1 }],
						scorchedVictoryTowns: 0,
					}),
					headers: headers(),
				});
			}
			return Promise.resolve({ ok: false, status: 500, headers: headers() });
		});
		const first = await getVictoryTownCounts();
		mockFetch.mockClear();
		const second = await getVictoryTownCounts();
		expect(second).toEqual(first);
		expect(mockFetch).not.toHaveBeenCalled();
	});

	it('getWarStatusSummary winner fallback NONE et victory null', async () => {
		mockFetch.mockImplementation((url) => {
			if (url === WARAPI_WAR_URL) {
				return Promise.resolve({
					ok: true,
					status: 200,
					json: () => Promise.resolve({
						warNumber: 1,
						conquestStartTime: Date.now() - 86400000,
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
			return Promise.resolve({ ok: false, status: 500, headers: headers() });
		});
		const summary = await getWarStatusSummary();
		expect(summary.winner).toBe('NONE');
		expect(summary.victoryTowns).toBeNull();
	});

	it('getWarStatusSummary required null sans victory soustrait', async () => {
		mockFetch.mockImplementation((url) => {
			if (url === WARAPI_WAR_URL) {
				return Promise.resolve({
					ok: true,
					status: 200,
					json: () => Promise.resolve({
						warNumber: 1,
						winner: 'NONE',
						requiredVictoryTowns: null,
						conquestStartTime: Date.now() - 86400000,
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
			return Promise.resolve({ ok: false, status: 500, headers: headers() });
		});
		const summary = await getWarStatusSummary();
		expect(summary.effectiveRequiredVictoryTowns).toBeNull();
	});

	it('getWarReport retourne cache chaud sans refetch réseau', async () => {
		mockFetch.mockResolvedValue({
			ok: true,
			status: 200,
			json: () => Promise.resolve({ hot: true }),
			headers: headers('max-age=3600', '"hot"'),
		});
		const first = await getWarReport('HotReport');
		mockFetch.mockClear();
		const second = await getWarReport('HotReport');
		expect(second).toEqual(first);
		expect(mockFetch).not.toHaveBeenCalled();
	});

	it('countVictoryTownsOnMap compte neutral et scorched inline', () => {
		expect(countVictoryTownsOnMap({
			mapItems: [
				{ teamId: 'NONE', flags: 1 },
				{ teamId: 'WARDENS', flags: 17 },
			],
			scorchedVictoryTowns: 0,
		})).toEqual({ colonial: 0, warden: 0, neutral: 1, scorched: 1 });
	});

	it('getWarStatusSummary cachedUntil null quand expiresAt zero', async () => {
		mockFetch.mockImplementation((url) => {
			if (url === WARAPI_WAR_URL) {
				return Promise.resolve({
					ok: true,
					status: 200,
					json: () => Promise.resolve({
						warNumber: 5,
						winner: 'NONE',
						conquestStartTime: Date.now() - 3600000,
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
					json: () => Promise.resolve({ response: { player_count: 100 } }),
					headers: headers(),
				});
			}
			return Promise.resolve({ ok: false, status: 404, headers: headers() });
		});
		await getWarStatusSummary();
		expireCacheForTests('war');
		mockFetch.mockRejectedValue(new Error('offline'));
		const summary = await getWarStatusSummary();
		expect(summary.available).toBe(true);
		expect(summary.cachedUntil).toBeNull();
	});

	it('getWarReport 304 reutilise max-age du cache-control', async () => {
		mockFetch
			.mockResolvedValueOnce({
				ok: true,
				status: 200,
				json: () => Promise.resolve({ first: true }),
				headers: headers('max-age=120', '"etag-304"'),
			})
			.mockResolvedValueOnce({
				ok: true,
				status: 304,
				json: () => Promise.resolve(null),
				headers: {
					get: (name) => {
						const n = String(name).toLowerCase();
						if (n === 'cache-control') return 'max-age=120';
						if (n === 'etag') return '"etag-304"';
						return null;
					},
				},
			});
		expireCacheForTests('reports');
		await getWarReport('MaxAge304');
		expireCacheForTests('reports');
		const second = await getWarReport('MaxAge304');
		expect(second).toEqual({ first: true });
		expect(mockFetch).toHaveBeenCalledTimes(2);
	});

	it('parseMaxAge applique max-age numerique', async () => {
		mockFetch.mockResolvedValue({
			ok: true,
			status: 200,
			json: () => Promise.resolve({ ok: true }),
			headers: {
				get: (name) => (String(name).toLowerCase() === 'cache-control' ? 'max-age=120' : null),
			},
		});
		expireCacheForTests('reports');
		await getWarReport('NumericMaxAge');
		expect(mockFetch).toHaveBeenCalled();
	});

	it('countVictoryTownsOnMap compte NONE quand teamId absent', () => {
		expect(countVictoryTownsOnMap({
			mapItems: [{ flags: 1 }],
		})).toEqual({ colonial: 0, warden: 0, neutral: 1, scorched: 0 });
	});

	it('expireCacheForTests default kind all', async () => {
		mockFetch.mockResolvedValue({
			ok: true,
			status: 200,
			json: () => Promise.resolve({ warNumber: 1, winner: 'NONE' }),
			headers: headers(),
		});
		await getWar();
		await getMaps();
		await getSteamPlayers();
		expireCacheForTests();
		mockFetch.mockClear();
		mockFetch.mockImplementation((url) => {
			if (url === WARAPI_WAR_URL) {
				return Promise.resolve({
					ok: true,
					status: 200,
					json: () => Promise.resolve({ warNumber: 2, winner: 'NONE' }),
					headers: headers('"w3"'),
				});
			}
			return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve([]), headers: headers() });
		});
		const war = await getWar();
		expect(war.warNumber).toBe(2);
	});

	it('parseMaxAge retourne null sans groupe max-age', async () => {
		mockFetch.mockResolvedValue({
			ok: true,
			status: 200,
			json: () => Promise.resolve({ report: true }),
			headers: { get: (name) => (String(name).toLowerCase() === 'cache-control' ? 'no-store' : null) },
		});
		expireCacheForTests('reports');
		await getWarReport('NoMaxAge');
		expect(mockFetch).toHaveBeenCalled();
	});

	it('countVictoryTownsOnMap compte WARDEN alias court', () => {
		expect(countVictoryTownsOnMap({
			mapItems: [{ teamId: 'WARDEN', flags: 1 }],
		})).toEqual({ colonial: 0, warden: 1, neutral: 0, scorched: 0 });
	});

	it('resetCacheForTests réinitialise tous les caches', async () => {
		mockFetch.mockResolvedValue({
			ok: true,
			status: 200,
			json: () => Promise.resolve({ warNumber: 9, winner: 'NONE' }),
			headers: headers(),
		});
		await getWar();
		await getWarReport('CacheReset');
		resetCacheForTests();
		mockFetch.mockClear();
		mockFetch.mockResolvedValue({
			ok: true,
			status: 200,
			json: () => Promise.resolve({ warNumber: 10, winner: 'NONE' }),
			headers: headers('"w2"'),
		});
		const war = await getWar();
		expect(war.warNumber).toBe(10);
		expect(mockFetch).toHaveBeenCalled();
	});

	it('parseMaxAge ignore max-age non numérique', async () => {
		mockFetch.mockResolvedValue({
			ok: true,
			status: 200,
			json: () => Promise.resolve({ report: true }),
			headers: {
				get: (name) => (String(name).toLowerCase() === 'cache-control' ? 'max-age=abc' : null),
			},
		});
		expireCacheForTests('reports');
		await getWarReport('BadMaxAge');
		expect(mockFetch).toHaveBeenCalled();
	});

	it('countVictoryTownsOnMap accepte dyn sans mapItems', () => {
		expect(countVictoryTownsOnMap({})).toEqual({
			colonial: 0, warden: 0, neutral: 0, scorched: 0,
		});
	});

	it('countVictoryTownsOnMap compte WARDENS alias', () => {
		expect(countVictoryTownsOnMap({
			mapItems: [{ teamId: 'WARDENS', flags: 1 }],
		})).toEqual({ colonial: 0, warden: 1, neutral: 0, scorched: 0 });
	});

	it('resetCacheForTests vide reports et expireCache reports seul', async () => {
		mockFetch.mockResolvedValue({
			ok: true,
			status: 200,
			json: () => Promise.resolve({ x: 1 }),
			headers: headers('max-age=60', '"r1"'),
		});
		await getWarReport('RepOnly');
		resetCacheForTests();
		expireCacheForTests('reports');
		mockFetch.mockClear();
		mockFetch.mockResolvedValue({
			ok: true,
			status: 200,
			json: () => Promise.resolve({ x: 2 }),
			headers: headers('max-age=60', '"r2"'),
		});
		const again = await getWarReport('RepOnly');
		expect(again).toEqual({ x: 2 });
		expect(mockFetch).toHaveBeenCalled();
	});

	it('expireCacheForTests par kind war maps victory reports', async () => {
		mockFetch.mockResolvedValue({
			ok: true,
			status: 200,
			json: () => Promise.resolve({ warNumber: 1, winner: 'NONE' }),
			headers: headers(),
		});
		await getWar();
		expireCacheForTests('war');
		await getWar();
		expect(mockFetch.mock.calls.length).toBeGreaterThanOrEqual(2);

		mockFetch.mockClear();
		mockFetch.mockResolvedValue({
			ok: true,
			status: 200,
			json: () => Promise.resolve(['MapA']),
			headers: headers(),
		});
		await getMaps();
		expireCacheForTests('maps');
		await getMaps();
		expect(mockFetch.mock.calls.length).toBeGreaterThanOrEqual(2);
	});
});
