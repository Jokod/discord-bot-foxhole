const WARAPI_ROOT = 'https://war-service-live.foxholeservices.com/api';
const WARAPI_WAR_URL = `${WARAPI_ROOT}/worldconquest/war`;
const WARAPI_MAPS_URL = `${WARAPI_ROOT}/worldconquest/maps`;

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

	it('status: renvoie un embed complet quand War API répond correctement', async () => {
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

		expect(embedData.title).toBe('Foxhole War – Status');

		const fields = embedData.fields ?? [];
		expect(fields.some((f) => f.name === 'War #' && f.value === String(warPayload.warNumber))).toBe(true);
		expect(fields.some((f) => f.name === 'Winner' && f.value === warPayload.winner)).toBe(true);
		expect(fields.some((f) => f.name === 'Required victory towns' && f.value === String(warPayload.requiredVictoryTowns))).toBe(true);
		expect(fields.some((f) => f.name === 'Short required towns' && f.value === String(warPayload.shortRequiredVictoryTowns))).toBe(true);
		expect(fields.some((f) => f.name === 'Conquest start')).toBe(true);
		expect(fields.some((f) => f.name === 'Conquest end')).toBe(true);
	});

	it('status: affiche un message d’erreur quand War API est indisponible', async () => {
		mockFetch.mockResolvedValue({
			ok: false,
			status: 500,
			json: () => Promise.resolve(null),
			headers: createHeaders(null, null),
		});

		const interaction = createInteraction('status');
		await warCommand.execute(interaction);

		expect(interaction.editReply).toHaveBeenCalledWith({
			content: 'War API is currently unavailable. Please try again later.',
		});
	});

	it('maps: renvoie un embed listant les cartes quand l’API répond', async () => {
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

		expect(embedData.title).toBe('Foxhole War – Maps');
		expect(embedData.description).toContain('DeadLandsHex');
		expect(embedData.description).toContain('UmbralWildwoodHex');
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
			content: 'War API (maps endpoint) is unavailable or returned no maps.',
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

		expect(embedData.title).toBe('War report – DeadLandsHex');

		const fields = embedData.fields ?? [];
		expect(fields.some((f) => f.name === 'Total enlistments' && f.value === String(reportPayload.totalEnlistments))).toBe(true);
		expect(fields.some((f) => f.name === 'Colonial casualties' && f.value === String(reportPayload.colonialCasualties))).toBe(true);
		expect(fields.some((f) => f.name === 'Warden casualties' && f.value === String(reportPayload.wardenCasualties))).toBe(true);
		expect(fields.some((f) => f.name === 'Day of war' && f.value === String(reportPayload.dayOfWar))).toBe(true);
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
			content: 'No war report data for map `DeadLandsHex` (or War API is unavailable).',
		});
	});

	it('retourne COMMAND_UNKNOWN pour un sous-commande inconnu', async () => {
		const interaction = createInteraction('unknown');
		await warCommand.execute(interaction);

		expect(interaction.editReply).toHaveBeenCalledWith({
			content: 'COMMAND_UNKNOWN',
		});
	});
});

