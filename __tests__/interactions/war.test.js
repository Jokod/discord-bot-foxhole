const WARAPI_ROOT = 'https://war-service-live.foxholeservices.com/api';
const WARAPI_WAR_URL = `${WARAPI_ROOT}/worldconquest/war`;
const WARAPI_MAPS_URL = `${WARAPI_ROOT}/worldconquest/maps`;
const STEAM_PLAYERS_URL = 'https://api.steampowered.com/ISteamUserStats/GetNumberOfCurrentPlayers/v1/?appid=505460';

const mockTranslate = jest.fn((key) => key);

jest.mock('../../utils/translations.js', () => {
	const fn = jest.fn();
	fn.mockImplementation(() => ({ translate: mockTranslate }));
	return fn;
});

jest.mock('../../utils/colors.js', () => ({
	getRandomColor: jest.fn().mockReturnValue(0x3498db),
}));

const { getV2Text, v2Text } = require('../helpers/v2Payload.js');

describe('Slash command /war', () => {
	let warCommand;
	let mockFetch;

	beforeEach(() => {
		jest.resetModules();
		jest.clearAllMocks();
		mockFetch = jest.fn();
		global.fetch = mockFetch;
		const { resetCacheForTests } = require('../../utils/foxholeWarApi.js');
		resetCacheForTests();
		warCommand = require('../../interactions/slash/misc/war.js');
	});

	function createInteraction(subcommand, mapName) {
		return {
			guild: { id: 'test-guild-id' },
			client: {},
			deferReply: jest.fn().mockResolvedValue(undefined),
			editReply: jest.fn().mockResolvedValue(undefined),
			options: {
				getSubcommand: () => subcommand,
				getString: (name) => (name === 'map' ? mapName : null),
			},
		};
	}

	function createHeaders(cacheControl = 'max-age=60', etag = '"etag"') {
		return {
			get: (name) => {
				if (name.toLowerCase() === 'cache-control') return cacheControl;
				if (name.toLowerCase() === 'etag') return etag;
				return null;
			},
		};
	}

	it('doit définir correctement les métadonnées de la commande', () => {
		expect(warCommand.data.name).toBe('war');
		const options = warCommand.data.options ?? [];
		expect(options).toHaveLength(3);
		expect(options.some((opt) => opt.name === 'status')).toBe(true);
		expect(options.some((opt) => opt.name === 'maps')).toBe(true);
		expect(options.some((opt) => opt.name === 'report')).toBe(true);
	});

	it('status: renvoie un embed complet avec joueurs Steam et War API', async () => {
		const warPayload = {
			warNumber: 132,
			winner: 'WARDEN',
			requiredVictoryTowns: 32,
			shortRequiredVictoryTowns: 4,
			conquestStartTime: 1_770_663_602_746,
			conquestEndTime: 1_770_663_702_746,
			scheduledConquestEndTime: null,
		};

		mockFetch.mockImplementation((url) => {
			if (url === WARAPI_WAR_URL) {
				return Promise.resolve({
					ok: true,
					status: 200,
					json: () => Promise.resolve(warPayload),
					headers: createHeaders(),
				});
			}
			if (url === WARAPI_MAPS_URL) {
				return Promise.resolve({
					ok: true,
					status: 200,
					json: () => Promise.resolve(['HexA']),
					headers: createHeaders(),
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
					headers: createHeaders(),
				});
			}
			if (url === STEAM_PLAYERS_URL) {
				return Promise.resolve({
					ok: true,
					status: 200,
					json: () => Promise.resolve({ response: { player_count: 15309 } }),
					headers: createHeaders(),
				});
			}
			return Promise.resolve({
				ok: false,
				status: 500,
				json: () => Promise.resolve(null),
				headers: createHeaders(null, null),
			});
		});

		const interaction = createInteraction('status');
		await warCommand.execute(interaction);

		expect(interaction.deferReply).toHaveBeenCalledWith({ flags: 64 });
		expect(interaction.editReply).toHaveBeenCalledTimes(1);

		const text = getV2Text(interaction.editReply.mock.calls[0][0]);

		expect(text).toContain('FOXHOLE_WAR_TITLE_ENDED');


		expect(text).toContain('FOXHOLE_PLAYERS_CURRENT');
		expect(text.replace(/\D/g, '')).toContain('15309');
		expect(text).toContain('FOXHOLE_WAR_NUMBER');
		expect(text).toContain(String(warPayload.warNumber));
		expect(text).toContain('FOXHOLE_WAR_WINNER');
		expect(text).toContain('FOXHOLE_WINNER_WARDEN');
		expect(text).toContain('FOXHOLE_WAR_COLONIAL_TOWNS');
		expect(text).toContain('1 / 32');
		expect(text).toContain('FOXHOLE_WAR_WARDEN_TOWNS');
		expect(text).toContain('2 / 32');
		expect(text).toContain('FOXHOLE_WAR_SHORT_REQUIRED_TOWNS');
		expect(text).toContain(String(warPayload.shortRequiredVictoryTowns));
		expect(text).toContain('FOXHOLE_WAR_START');
		expect(text).toContain('FOXHOLE_WAR_END');
		expect(text).toContain('FOXHOLE_WAR_DAY');
		expect(text).toContain('FOXHOLE_WAR_ELAPSED');
	});

	it('status: guerre terminée sans vainqueur → FOXHOLE_WINNER_ENDED (pas NONE)', async () => {
		const warPayload = {
			warNumber: 133,
			winner: 'NONE',
			requiredVictoryTowns: 32,
			conquestStartTime: 1_770_663_602_746,
			conquestEndTime: 1_770_663_702_746,
		};

		mockFetch.mockImplementation((url) => {
			if (url === WARAPI_WAR_URL) {
				return Promise.resolve({
					ok: true,
					status: 200,
					json: () => Promise.resolve(warPayload),
					headers: createHeaders(),
				});
			}
			if (url === WARAPI_MAPS_URL) {
				return Promise.resolve({
					ok: true,
					status: 200,
					json: () => Promise.resolve([]),
					headers: createHeaders(),
				});
			}
			if (url === STEAM_PLAYERS_URL) {
				return Promise.resolve({
					ok: true,
					status: 200,
					json: () => Promise.resolve({ response: { player_count: 100 } }),
					headers: createHeaders(),
				});
			}
			return Promise.resolve({ ok: false, status: 500, headers: createHeaders(null, null) });
		});

		const interaction = createInteraction('status');
		await warCommand.execute(interaction);

		const text = getV2Text(interaction.editReply.mock.calls[0][0]);
		expect(text).toContain('FOXHOLE_WAR_TITLE_ENDED');

		expect(text).toContain('FOXHOLE_WAR_WINNER');
		expect(text).toContain('FOXHOLE_WINNER_ENDED');
	});

	it('status: affiche FOXHOLE_UNAVAILABLE pour les joueurs si Steam échoue', async () => {
		mockFetch.mockImplementation((url) => {
			if (url === WARAPI_WAR_URL) {
				return Promise.resolve({
					ok: true,
					status: 200,
					json: () => Promise.resolve({
						warNumber: 132,
						winner: 'NONE',
						requiredVictoryTowns: 32,
						conquestStartTime: Date.now() - 86400000,
					}),
					headers: createHeaders(),
				});
			}
			if (url === WARAPI_MAPS_URL) {
				return Promise.resolve({
					ok: true,
					status: 200,
					json: () => Promise.resolve([]),
					headers: createHeaders(),
				});
			}
			if (url === STEAM_PLAYERS_URL) return Promise.reject(new Error('Network error'));
			return Promise.resolve({ ok: false, status: 500, headers: createHeaders(null, null) });
		});

		const interaction = createInteraction('status');
		await warCommand.execute(interaction);

		const text = getV2Text(interaction.editReply.mock.calls[0][0]);
		expect(text).toContain('FOXHOLE_PLAYERS_CURRENT');
		expect(text).toContain('FOXHOLE_UNAVAILABLE');
	});

	it('status: affiche FOXHOLE_ALL_UNAVAILABLE quand War et Steam échouent', async () => {
		mockFetch.mockResolvedValue({
			ok: false,
			status: 500,
			json: () => Promise.resolve(null),
			headers: createHeaders(null, null),
		});

		const interaction = createInteraction('status');
		await warCommand.execute(interaction);

		expect(interaction.editReply).toHaveBeenCalledWith(v2Text('FOXHOLE_ALL_UNAVAILABLE'));
	});

	it('status: War indisponible mais Steam OK → embed partiel joueurs + guerre indisponible', async () => {
		mockFetch.mockImplementation((url) => {
			if (url === WARAPI_WAR_URL) {
				return Promise.resolve({
					ok: true,
					status: 200,
					json: () => Promise.resolve({}),
					headers: createHeaders(),
				});
			}
			if (url === STEAM_PLAYERS_URL) {
				return Promise.resolve({
					ok: true,
					status: 200,
					json: () => Promise.resolve({ response: { player_count: 4200 } }),
					headers: createHeaders(),
				});
			}
			return Promise.resolve({ ok: false, status: 500, headers: createHeaders(null, null) });
		});

		const interaction = createInteraction('status');
		await warCommand.execute(interaction);

		const text = getV2Text(interaction.editReply.mock.calls[0][0]);
		expect(text).toContain('FOXHOLE_TITLE');

		expect(text).toContain('FOXHOLE_PLAYERS_CURRENT');
		expect(text.replace(/\D/g, '')).toContain('4200');
		expect(text).toContain('FOXHOLE_WAR_TITLE');
		expect(text).toContain('FOXHOLE_UNAVAILABLE');
	});

	it('status: affiche les villes calcinées quand scorched > 0', async () => {
		mockFetch.mockImplementation((url) => {
			if (url === WARAPI_WAR_URL) {
				return Promise.resolve({
					ok: true,
					status: 200,
					json: () => Promise.resolve({
						warNumber: 140,
						winner: 'NONE',
						requiredVictoryTowns: 32,
						conquestStartTime: Date.now() - 86400000,
					}),
					headers: createHeaders(),
				});
			}
			if (url === WARAPI_MAPS_URL) {
				return Promise.resolve({
					ok: true,
					status: 200,
					json: () => Promise.resolve(['HexA']),
					headers: createHeaders(),
				});
			}
			if (String(url).includes('/dynamic/public')) {
				return Promise.resolve({
					ok: true,
					status: 200,
					json: () => Promise.resolve({
						mapItems: [{ teamId: 'COLONIALS', flags: 1 }],
						scorchedVictoryTowns: 3,
					}),
					headers: createHeaders(),
				});
			}
			if (url === STEAM_PLAYERS_URL) {
				return Promise.resolve({
					ok: true,
					status: 200,
					json: () => Promise.resolve({ response: { player_count: 100 } }),
					headers: createHeaders(),
				});
			}
			return Promise.resolve({ ok: false, status: 500, headers: createHeaders(null, null) });
		});

		const interaction = createInteraction('status');
		await warCommand.execute(interaction);

		const text = getV2Text(interaction.editReply.mock.calls[0][0]);
		expect(text).toContain('FOXHOLE_WAR_SCORCHED_TOWNS');
		expect(text).toContain('3');
	});

	it('status: guerre en cours avec fin planifiée', async () => {
		const scheduledEnd = Date.now() + 7 * 86400000;
		mockFetch.mockImplementation((url) => {
			if (url === WARAPI_WAR_URL) {
				return Promise.resolve({
					ok: true,
					status: 200,
					json: () => Promise.resolve({
						warNumber: 141,
						winner: 'NONE',
						requiredVictoryTowns: 32,
						conquestStartTime: Date.now() - 86400000,
						conquestEndTime: null,
						scheduledConquestEndTime: scheduledEnd,
					}),
					headers: createHeaders(),
				});
			}
			if (url === WARAPI_MAPS_URL) {
				return Promise.resolve({
					ok: true,
					status: 200,
					json: () => Promise.resolve([]),
					headers: createHeaders(),
				});
			}
			if (url === STEAM_PLAYERS_URL) {
				return Promise.resolve({
					ok: true,
					status: 200,
					json: () => Promise.resolve({ response: { player_count: 100 } }),
					headers: createHeaders(),
				});
			}
			return Promise.resolve({ ok: false, status: 500, headers: createHeaders(null, null) });
		});

		const interaction = createInteraction('status');
		await warCommand.execute(interaction);

		const text = getV2Text(interaction.editReply.mock.calls[0][0]);
		expect(text).toContain('FOXHOLE_WAR_SCHEDULED_END');
		expect(text).not.toContain('FOXHOLE_WAR_END');
	});

	it('status: guerre non terminée avec conquestEndTime sans fin planifiée', async () => {
		const endTime = Date.now() + 3 * 86400000;
		mockFetch.mockImplementation((url) => {
			if (url === WARAPI_WAR_URL) {
				return Promise.resolve({
					ok: true,
					status: 200,
					json: () => Promise.resolve({
						warNumber: 142,
						winner: 'NONE',
						requiredVictoryTowns: 32,
						conquestStartTime: Date.now() - 86400000,
						conquestEndTime: endTime,
						scheduledConquestEndTime: null,
					}),
					headers: createHeaders(),
				});
			}
			if (url === WARAPI_MAPS_URL) {
				return Promise.resolve({
					ok: true,
					status: 200,
					json: () => Promise.resolve([]),
					headers: createHeaders(),
				});
			}
			if (url === STEAM_PLAYERS_URL) {
				return Promise.resolve({
					ok: true,
					status: 200,
					json: () => Promise.resolve({ response: { player_count: 100 } }),
					headers: createHeaders(),
				});
			}
			return Promise.resolve({ ok: false, status: 500, headers: createHeaders(null, null) });
		});

		const interaction = createInteraction('status');
		await warCommand.execute(interaction);

		const text = getV2Text(interaction.editReply.mock.calls[0][0]);
		expect(text).toContain('FOXHOLE_WAR_END');
		expect(text).not.toContain('FOXHOLE_WAR_SCHEDULED_END');
	});

	it('status: conquestEndTime présent mais guerre non terminée (branche else if)', async () => {
		mockFetch.mockImplementation((url) => {
			if (url === WARAPI_WAR_URL) {
				return Promise.resolve({
					ok: true,
					status: 200,
					json: () => Promise.resolve({
						warNumber: 144,
						winner: 'NONE',
						requiredVictoryTowns: 32,
						conquestStartTime: Date.now() - 86400000,
						conquestEndTime: -1,
						scheduledConquestEndTime: null,
					}),
					headers: createHeaders(),
				});
			}
			if (url === WARAPI_MAPS_URL) {
				return Promise.resolve({
					ok: true,
					status: 200,
					json: () => Promise.resolve([]),
					headers: createHeaders(),
				});
			}
			if (url === STEAM_PLAYERS_URL) {
				return Promise.resolve({
					ok: true,
					status: 200,
					json: () => Promise.resolve({ response: { player_count: 100 } }),
					headers: createHeaders(),
				});
			}
			return Promise.resolve({ ok: false, status: 500, headers: createHeaders(null, null) });
		});

		const interaction = createInteraction('status');
		await warCommand.execute(interaction);

		const text = getV2Text(interaction.editReply.mock.calls[0][0]);
		expect(text).toContain('FOXHOLE_WAR_END');
	});

	it('status: vainqueur COLONIAL et requiredVictoryTowns sans vt', async () => {
		mockFetch.mockImplementation((url) => {
			if (url === WARAPI_WAR_URL) {
				return Promise.resolve({
					ok: true,
					status: 200,
					json: () => Promise.resolve({
						warNumber: 143,
						winner: 'COLONIAL',
						requiredVictoryTowns: 28,
						conquestStartTime: Date.now() - 86400000,
					}),
					headers: createHeaders(),
				});
			}
			if (url === WARAPI_MAPS_URL) {
				return Promise.resolve({
					ok: true,
					status: 200,
					json: () => Promise.resolve([]),
					headers: createHeaders(),
				});
			}
			if (url === STEAM_PLAYERS_URL) {
				return Promise.resolve({
					ok: true,
					status: 200,
					json: () => Promise.resolve({ response: { player_count: 100 } }),
					headers: createHeaders(),
				});
			}
			return Promise.resolve({ ok: false, status: 500, headers: createHeaders(null, null) });
		});

		const interaction = createInteraction('status');
		await warCommand.execute(interaction);

		const text = getV2Text(interaction.editReply.mock.calls[0][0]);

		expect(text).toContain('FOXHOLE_WAR_WINNER');
		expect(text).toContain('FOXHOLE_WINNER_COLONIAL');
		expect(text).toContain('FOXHOLE_WAR_REQUIRED_TOWNS');
		expect(text).toContain('28');
	});

	it('status: vt sans need affiche les totaux bruts', async () => {
		mockFetch.mockImplementation((url) => {
			if (url === WARAPI_WAR_URL) {
				return Promise.resolve({
					ok: true,
					status: 200,
					json: () => Promise.resolve({
						warNumber: 145,
						winner: 'NONE',
						conquestStartTime: Date.now() - 86400000,
					}),
					headers: createHeaders(),
				});
			}
			if (url === WARAPI_MAPS_URL) {
				return Promise.resolve({
					ok: true,
					status: 200,
					json: () => Promise.resolve(['HexA']),
					headers: createHeaders(),
				});
			}
			if (String(url).includes('/dynamic/public')) {
				return Promise.resolve({
					ok: true,
					status: 200,
					json: () => Promise.resolve({
						mapItems: [{ teamId: 'COLONIALS', flags: 1 }, { teamId: 'WARDENS', flags: 1 }],
						scorchedVictoryTowns: 0,
					}),
					headers: createHeaders(),
				});
			}
			if (url === STEAM_PLAYERS_URL) {
				return Promise.resolve({
					ok: true,
					status: 200,
					json: () => Promise.resolve({ response: { player_count: 100 } }),
					headers: createHeaders(),
				});
			}
			return Promise.resolve({ ok: false, status: 500, headers: createHeaders(null, null) });
		});

		const interaction = createInteraction('status');
		await warCommand.execute(interaction);

		const text = getV2Text(interaction.editReply.mock.calls[0][0]);
		expect(text).toContain('FOXHOLE_WAR_COLONIAL_TOWNS');
		expect(text).toContain('1');
		expect(text).toContain('FOXHOLE_WAR_WARDEN_TOWNS');
		expect(text).toContain('1');
	});

	it('status: sans dayOfWar ni elapsed ni vt mais avec requiredVictoryTowns', async () => {
		mockFetch.mockImplementation((url) => {
			if (url === WARAPI_WAR_URL) {
				return Promise.resolve({
					ok: true,
					status: 200,
					json: () => Promise.resolve({
						warNumber: 146,
						winner: 'NONE',
						requiredVictoryTowns: 30,
						conquestStartTime: null,
						conquestEndTime: null,
					}),
					headers: createHeaders(),
				});
			}
			if (url === WARAPI_MAPS_URL) {
				return Promise.resolve({
					ok: true,
					status: 200,
					json: () => Promise.resolve([]),
					headers: createHeaders(),
				});
			}
			if (url === STEAM_PLAYERS_URL) {
				return Promise.resolve({
					ok: true,
					status: 200,
					json: () => Promise.resolve({ response: { player_count: 100 } }),
					headers: createHeaders(),
				});
			}
			return Promise.resolve({ ok: false, status: 500, headers: createHeaders(null, null) });
		});

		const interaction = createInteraction('status');
		await warCommand.execute(interaction);

		const text = getV2Text(interaction.editReply.mock.calls[0][0]);
		expect(text).toContain('FOXHOLE_WAR_REQUIRED_TOWNS');
		expect(text).toContain('30');
		expect(text).not.toContain('FOXHOLE_WAR_DAY');
		expect(text).not.toContain('FOXHOLE_WAR_ELAPSED');
	});

	it('status: requiredVictoryTowns sans données vt (maps vides)', async () => {
		mockFetch.mockImplementation((url) => {
			if (url === WARAPI_WAR_URL) {
				return Promise.resolve({
					ok: true,
					status: 200,
					json: () => Promise.resolve({
						warNumber: 147,
						winner: 'NONE',
						requiredVictoryTowns: 31,
						conquestStartTime: null,
					}),
					headers: createHeaders(),
				});
			}
			if (url === WARAPI_MAPS_URL) {
				return Promise.resolve({
					ok: true,
					status: 200,
					json: () => Promise.resolve([]),
					headers: createHeaders(),
				});
			}
			if (url === STEAM_PLAYERS_URL) {
				return Promise.resolve({
					ok: true,
					status: 200,
					json: () => Promise.resolve({ response: { player_count: 50 } }),
					headers: createHeaders(),
				});
			}
			return Promise.resolve({ ok: false, status: 500, headers: createHeaders(null, null) });
		});

		const interaction = createInteraction('status');
		await warCommand.execute(interaction);

		const text = getV2Text(interaction.editReply.mock.calls[0][0]);
		expect(text).toContain('FOXHOLE_WAR_REQUIRED_TOWNS');
		expect(text).toContain('31');
		expect(text).not.toContain('FOXHOLE_WAR_COLONIAL_TOWNS');
	});

	it('status: sans vt ni requiredVictoryTowns', async () => {
		mockFetch.mockImplementation((url) => {
			if (url === WARAPI_WAR_URL) {
				return Promise.resolve({
					ok: true,
					status: 200,
					json: () => Promise.resolve({
						warNumber: 148,
						winner: 'NONE',
						conquestStartTime: null,
					}),
					headers: createHeaders(),
				});
			}
			if (url === WARAPI_MAPS_URL) {
				return Promise.resolve({
					ok: true,
					status: 200,
					json: () => Promise.resolve([]),
					headers: createHeaders(),
				});
			}
			if (url === STEAM_PLAYERS_URL) {
				return Promise.resolve({
					ok: true,
					status: 200,
					json: () => Promise.resolve({ response: { player_count: 50 } }),
					headers: createHeaders(),
				});
			}
			return Promise.resolve({ ok: false, status: 500, headers: createHeaders(null, null) });
		});

		const interaction = createInteraction('status');
		await warCommand.execute(interaction);

		const text = getV2Text(interaction.editReply.mock.calls[0][0]);
		expect(text).not.toContain('FOXHOLE_WAR_REQUIRED_TOWNS');
		expect(text).not.toContain('FOXHOLE_WAR_COLONIAL_TOWNS');
	});

	it('report: casualties null → 0 par défaut', async () => {
		mockFetch.mockImplementation((url) => {
			if (url.startsWith(`${WARAPI_ROOT}/worldconquest/warReport/`)) {
				return Promise.resolve({
					ok: true,
					status: 200,
					json: () => Promise.resolve({
						totalEnlistments: 10,
						colonialCasualties: null,
						wardenCasualties: null,
					}),
					headers: createHeaders(),
				});
			}
			return Promise.resolve({ ok: false, status: 500, headers: createHeaders(null, null) });
		});

		const interaction = createInteraction('report', 'HexA');
		await warCommand.execute(interaction);

		const text = getV2Text(interaction.editReply.mock.calls[0][0]);
		expect(text).toContain('FOXHOLE_REPORT_COLONIAL_CASUALTIES');
		expect(text).toContain('0');
		expect(text).toContain('FOXHOLE_REPORT_WARDEN_CASUALTIES');
		expect(text).toContain('0');
	});

	it('maps: renvoie un embed listant les cartes et le lien foxholestats', async () => {
		const mapsPayload = ['DeadLandsHex', 'UmbralWildwoodHex'];

		mockFetch.mockImplementation((url) => {
			if (url === WARAPI_MAPS_URL) {
				return Promise.resolve({
					ok: true,
					status: 200,
					json: () => Promise.resolve(mapsPayload),
					headers: createHeaders('max-age=600'),
				});
			}
			return Promise.resolve({
				ok: false,
				status: 500,
				json: () => Promise.resolve(null),
				headers: createHeaders(null, null),
			});
		});

		const interaction = createInteraction('maps');
		await warCommand.execute(interaction);

		expect(interaction.deferReply).toHaveBeenCalledWith({ flags: 64 });
		expect(interaction.editReply).toHaveBeenCalledTimes(1);

		const text = getV2Text(interaction.editReply.mock.calls[0][0]);

		expect(text).toContain('FOXHOLE_MAPS_TITLE');
		expect(text).toContain('DeadLandsHex');
		expect(text).toContain('UmbralWildwoodHex');
		expect(text).toContain('https://foxholestats.com/');
	});

	it('maps: affiche un message d’erreur quand aucune carte n’est renvoyée', async () => {
		mockFetch.mockResolvedValue({
			ok: false,
			status: 500,
			json: () => Promise.resolve(null),
			headers: createHeaders(null, null),
		});

		const interaction = createInteraction('maps');
		await warCommand.execute(interaction);

		expect(interaction.editReply).toHaveBeenCalledWith(v2Text('FOXHOLE_MAPS_UNAVAILABLE'));
	});

	it('report: renvoie un embed de rapport de guerre quand les données existent', async () => {
		const reportPayload = {
			totalEnlistments: 1234,
			colonialCasualties: 200,
			wardenCasualties: 300,
			dayOfWar: 5,
		};

		mockFetch.mockImplementation((url) => {
			if (url.startsWith(`${WARAPI_ROOT}/worldconquest/warReport/`)) {
				return Promise.resolve({
					ok: true,
					status: 200,
					json: () => Promise.resolve(reportPayload),
					headers: createHeaders('max-age=5'),
				});
			}
			return Promise.resolve({
				ok: false,
				status: 500,
				json: () => Promise.resolve(null),
				headers: createHeaders(null, null),
			});
		});

		const interaction = createInteraction('report', 'DeadLandsHex');
		await warCommand.execute(interaction);

		expect(interaction.deferReply).toHaveBeenCalledWith({ flags: 64 });
		expect(interaction.editReply).toHaveBeenCalledTimes(1);

		const text = getV2Text(interaction.editReply.mock.calls[0][0]);

		expect(text).toContain('FOXHOLE_REPORT_TITLE');


		expect(text).toContain('FOXHOLE_REPORT_ENLISTMENTS');
		expect(text).toContain(String(reportPayload.totalEnlistments));
		expect(text).toContain('FOXHOLE_REPORT_COLONIAL_CASUALTIES');
		expect(text).toContain(String(reportPayload.colonialCasualties));
		expect(text).toContain('FOXHOLE_REPORT_WARDEN_CASUALTIES');
		expect(text).toContain(String(reportPayload.wardenCasualties));
		expect(text).toContain('FOXHOLE_REPORT_DAY');
		expect(text).toContain(String(reportPayload.dayOfWar));
	});

	it('report: affiche un message d’erreur quand le rapport est indisponible', async () => {
		mockFetch.mockResolvedValue({
			ok: false,
			status: 500,
			json: () => Promise.resolve(null),
			headers: createHeaders(null, null),
		});

		const interaction = createInteraction('report', 'DeadLandsHex');
		await warCommand.execute(interaction);

		expect(interaction.editReply).toHaveBeenCalledWith(v2Text('FOXHOLE_REPORT_UNAVAILABLE'));
	});

	it('retourne COMMAND_UNKNOWN pour un sous-commande inconnu', async () => {
		const interaction = createInteraction('unknown');
		await warCommand.execute(interaction);

		expect(interaction.editReply).toHaveBeenCalledWith(v2Text('COMMAND_UNKNOWN'));
	});

	it('status: sert le cache mémoire 1j sans revalider à chaque appel', async () => {
		const warPayload = {
			warNumber: 133,
			winner: 'NONE',
			requiredVictoryTowns: 32,
			conquestStartTime: 1_770_663_602_746,
			conquestEndTime: 1_770_663_702_746,
		};
		mockFetch.mockImplementation((url) => {
			if (url === WARAPI_WAR_URL) {
				return Promise.resolve({
					ok: true,
					status: 200,
					json: () => Promise.resolve(warPayload),
					headers: createHeaders('max-age=60', '"first-etag"'),
				});
			}
			if (url === STEAM_PLAYERS_URL) {
				return Promise.resolve({
					ok: true,
					status: 200,
					json: () => Promise.resolve({ response: { player_count: 100 } }),
					headers: createHeaders(),
				});
			}
			return Promise.resolve({ ok: false, status: 500, headers: createHeaders(null, null) });
		});

		await warCommand.execute(createInteraction('status'));
		await warCommand.execute(createInteraction('status'));

		const warCalls = mockFetch.mock.calls.filter((c) => c[0] === WARAPI_WAR_URL);
		expect(warCalls).toHaveLength(1);
	});

	it('maps: sert le cache mémoire 1j sans revalider à chaque appel', async () => {
		const mapsPayload = ['HexA', 'HexB'];
		mockFetch.mockImplementation((url) => {
			if (url === WARAPI_MAPS_URL) {
				return Promise.resolve({
					ok: true,
					status: 200,
					json: () => Promise.resolve(mapsPayload),
					headers: createHeaders('max-age=60', '"maps-etag"'),
				});
			}
			return Promise.resolve({ ok: false, status: 500, headers: createHeaders(null, null) });
		});

		await warCommand.execute(createInteraction('maps'));
		await warCommand.execute(createInteraction('maps'));

		expect(mockFetch).toHaveBeenCalledTimes(1);
	});

	it('report: utilise le cache 304 Not Modified', async () => {
		const reportPayload = { totalEnlistments: 500, colonialCasualties: 10, wardenCasualties: 20 };
		let callCount = 0;
		mockFetch.mockImplementation((url) => {
			if (url.includes('/warReport/')) {
				callCount++;
				if (callCount === 1) {
					return Promise.resolve({
						ok: true,
						status: 200,
						json: () => Promise.resolve(reportPayload),
						headers: createHeaders('max-age=0', '"report-etag"'),
					});
				}
				return Promise.resolve({
					ok: true,
					status: 304,
					headers: createHeaders('max-age=5', '"report-etag"'),
				});
			}
			return Promise.resolve({ ok: false, status: 500, headers: createHeaders(null, null) });
		});

		await warCommand.execute(createInteraction('report', 'DeadLandsHex'));
		await warCommand.execute(createInteraction('report', 'DeadLandsHex'));

		expect(mockFetch).toHaveBeenCalledTimes(2);
	});
});
