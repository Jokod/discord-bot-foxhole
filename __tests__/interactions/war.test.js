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

describe('Slash command /war', () => {
	let warCommand;
	let mockFetch;

	beforeEach(() => {
		jest.resetModules();
		jest.clearAllMocks();
		mockFetch = jest.fn();
		global.fetch = mockFetch;
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

		const { embeds } = interaction.editReply.mock.calls[0][0];
		expect(embeds).toHaveLength(1);
		const embed = embeds[0];
		const embedData = embed.data ?? embed;

		expect(embedData.title).toBe('FOXHOLE_TITLE');

		const fields = embedData.fields ?? [];
		const playersField = fields.find((f) => f.name === 'FOXHOLE_PLAYERS_CURRENT');
		expect(playersField).toBeDefined();
		expect(playersField.value.replace(/\D/g, '')).toBe('15309');
		expect(fields.some((f) => f.name === 'FOXHOLE_WAR_NUMBER' && f.value === String(warPayload.warNumber))).toBe(true);
		expect(fields.some((f) => f.name === 'FOXHOLE_WAR_WINNER')).toBe(true);
		expect(fields.some((f) => f.name === 'FOXHOLE_WAR_REQUIRED_TOWNS' && f.value === String(warPayload.requiredVictoryTowns))).toBe(true);
		expect(fields.some((f) => f.name === 'FOXHOLE_WAR_SHORT_REQUIRED_TOWNS' && f.value === String(warPayload.shortRequiredVictoryTowns))).toBe(true);
		expect(fields.some((f) => f.name === 'FOXHOLE_WAR_START')).toBe(true);
		expect(fields.some((f) => f.name === 'FOXHOLE_WAR_END')).toBe(true);
	});

	it('status: affiche FOXHOLE_UNAVAILABLE pour les joueurs si Steam échoue', async () => {
		mockFetch.mockImplementation((url) => {
			if (url === WARAPI_WAR_URL) {
				return Promise.resolve({
					ok: true,
					status: 200,
					json: () => Promise.resolve({ warNumber: 132, winner: 'NONE', requiredVictoryTowns: 32 }),
					headers: createHeaders(),
				});
			}
			if (url === STEAM_PLAYERS_URL) return Promise.reject(new Error('Network error'));
			return Promise.resolve({ ok: false, status: 500, headers: createHeaders(null, null) });
		});

		const interaction = createInteraction('status');
		await warCommand.execute(interaction);

		const embed = interaction.editReply.mock.calls[0][0].embeds[0];
		const embedData = embed.data ?? embed;
		const playersField = (embedData.fields ?? []).find((f) => f.name === 'FOXHOLE_PLAYERS_CURRENT');
		expect(playersField.value).toBe('FOXHOLE_UNAVAILABLE');
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

		expect(interaction.editReply).toHaveBeenCalledWith({
			content: 'FOXHOLE_ALL_UNAVAILABLE',
		});
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

		const { embeds } = interaction.editReply.mock.calls[0][0];
		expect(embeds).toHaveLength(1);
		const embed = embeds[0];
		const embedData = embed.data ?? embed;

		expect(embedData.title).toBe('FOXHOLE_MAPS_TITLE');
		expect(embedData.description).toContain('DeadLandsHex');
		expect(embedData.description).toContain('UmbralWildwoodHex');
		expect(embedData.description).toContain('https://foxholestats.com/');
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

		expect(interaction.editReply).toHaveBeenCalledWith({
			content: 'FOXHOLE_MAPS_UNAVAILABLE',
		});
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

		const { embeds } = interaction.editReply.mock.calls[0][0];
		expect(embeds).toHaveLength(1);
		const embed = embeds[0];
		const embedData = embed.data ?? embed;

		expect(embedData.title).toBe('FOXHOLE_REPORT_TITLE');

		const fields = embedData.fields ?? [];
		expect(fields.some((f) => f.name === 'FOXHOLE_REPORT_ENLISTMENTS' && f.value === String(reportPayload.totalEnlistments))).toBe(true);
		expect(fields.some((f) => f.name === 'FOXHOLE_REPORT_COLONIAL_CASUALTIES' && f.value === String(reportPayload.colonialCasualties))).toBe(true);
		expect(fields.some((f) => f.name === 'FOXHOLE_REPORT_WARDEN_CASUALTIES' && f.value === String(reportPayload.wardenCasualties))).toBe(true);
		expect(fields.some((f) => f.name === 'FOXHOLE_REPORT_DAY' && f.value === String(reportPayload.dayOfWar))).toBe(true);
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

		expect(interaction.editReply).toHaveBeenCalledWith({
			content: 'FOXHOLE_REPORT_UNAVAILABLE',
		});
	});

	it('retourne COMMAND_UNKNOWN pour un sous-commande inconnu', async () => {
		const interaction = createInteraction('unknown');
		await warCommand.execute(interaction);

		expect(interaction.editReply).toHaveBeenCalledWith({
			content: 'COMMAND_UNKNOWN',
		});
	});

	it('status: utilise le cache 304 Not Modified quand l\'ETag est valide', async () => {
		const warPayload = {
			warNumber: 133,
			winner: 'NONE',
			requiredVictoryTowns: 32,
			conquestStartTime: 1_770_663_602_746,
			conquestEndTime: 1_770_663_702_746,
		};
		let warCallCount = 0;
		mockFetch.mockImplementation((url) => {
			if (url === WARAPI_WAR_URL) {
				warCallCount++;
				if (warCallCount === 1) {
					return Promise.resolve({
						ok: true,
						status: 200,
						json: () => Promise.resolve(warPayload),
						headers: createHeaders('max-age=0', '"first-etag"'),
					});
				}
				return Promise.resolve({
					ok: true,
					status: 304,
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

		expect(mockFetch).toHaveBeenCalledWith(WARAPI_WAR_URL, expect.objectContaining({
			headers: expect.objectContaining({ 'If-None-Match': '"first-etag"' }),
		}));
	});

	it('maps: utilise le cache 304 Not Modified', async () => {
		const mapsPayload = ['HexA', 'HexB'];
		let callCount = 0;
		mockFetch.mockImplementation((url) => {
			if (url === WARAPI_MAPS_URL) {
				callCount++;
				if (callCount === 1) {
					return Promise.resolve({
						ok: true,
						status: 200,
						json: () => Promise.resolve(mapsPayload),
						headers: createHeaders('max-age=0', '"maps-etag"'),
					});
				}
				return Promise.resolve({
					ok: true,
					status: 304,
					headers: createHeaders('max-age=600', '"maps-etag"'),
				});
			}
			return Promise.resolve({ ok: false, status: 500, headers: createHeaders(null, null) });
		});

		await warCommand.execute(createInteraction('maps'));
		await warCommand.execute(createInteraction('maps'));

		expect(mockFetch).toHaveBeenCalledTimes(2);
		expect(mockFetch).toHaveBeenNthCalledWith(2, WARAPI_MAPS_URL, expect.objectContaining({
			headers: expect.objectContaining({ 'If-None-Match': '"maps-etag"' }),
		}));
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
