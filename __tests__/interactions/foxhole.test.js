const STEAM_PLAYERS_URL = 'https://api.steampowered.com/ISteamUserStats/GetNumberOfCurrentPlayers/v1/?appid=505460';
const FOXHOLE_WAR_URL = 'https://war-service-live.foxholeservices.com/api/worldconquest/war';

const mockTranslate = jest.fn((key) => key);
jest.mock('../../utils/translations.js', () => {
	const fn = jest.fn();
	fn.mockImplementation(() => ({ translate: mockTranslate }));
	return fn;
});

jest.mock('../../utils/colors.js', () => ({
	getRandomColor: jest.fn().mockReturnValue(0x3498db),
}));

describe('Slash command /foxhole info', () => {
	let foxholeCommand;
	let mockFetch;

	beforeEach(() => {
		jest.clearAllMocks();
		mockFetch = jest.fn();
		global.fetch = mockFetch;
		foxholeCommand = require('../../interactions/slash/misc/foxhole.js');
	});

	function mockInteraction() {
		return {
			guild: { id: 'test-guild-id' },
			client: {},
			deferReply: jest.fn().mockResolvedValue(undefined),
			editReply: jest.fn().mockResolvedValue(undefined),
			options: { getSubcommand: () => 'info' },
		};
	}

	it('should have data with name foxhole and subcommand info', () => {
		expect(foxholeCommand.data.name).toBe('foxhole');
		expect(foxholeCommand.data.options).toHaveLength(1);
		expect(foxholeCommand.data.options[0].name).toBe('info');
	});

	it('should deferReply with ephemeral then editReply with embed when both APIs succeed', async () => {
		mockFetch
			.mockImplementation((url) => {
				if (url === STEAM_PLAYERS_URL) {
					return Promise.resolve({
						ok: true,
						json: () => Promise.resolve({ response: { player_count: 15309, result: 1 } }),
					});
				}
				if (url === FOXHOLE_WAR_URL) {
					return Promise.resolve({
						ok: true,
						json: () => Promise.resolve({
							warNumber: 132,
							winner: 'NONE',
							requiredVictoryTowns: 32,
							conquestStartTime: 1770663602746,
						}),
					});
				}
				return Promise.resolve({ ok: false });
			});

		const interaction = mockInteraction();
		await foxholeCommand.execute(interaction);

		expect(interaction.deferReply).toHaveBeenCalledWith({ flags: 64 });
		expect(interaction.editReply).toHaveBeenCalledTimes(1);
		const { embeds } = interaction.editReply.mock.calls[0][0];
		expect(embeds).toHaveLength(1);
		const embed = embeds[0];
		const embedData = embed.data ?? embed;
		expect(embedData.title).toBe('FOXHOLE_TITLE');
		const fields = embedData.fields ?? [];
		const playersField = fields.find(f => f.name === 'FOXHOLE_PLAYERS_CURRENT');
		expect(playersField).toBeDefined();
		// toLocaleString() format varies by locale (e.g. "15,309", "15 309")
		expect(playersField.value.replace(/\D/g, '')).toBe('15309');
		expect(fields.some(f => f.name === 'FOXHOLE_WAR_NUMBER' && f.value === '132')).toBe(true);
		expect(fields.some(f => f.name === 'FOXHOLE_WAR_WINNER')).toBe(true);
		expect(fields.some(f => f.name === 'FOXHOLE_WAR_REQUIRED_TOWNS' && f.value === '32')).toBe(true);
	});

	it('should show FOXHOLE_UNAVAILABLE for players when Steam API fails', async () => {
		mockFetch
			.mockImplementation((url) => {
				if (url === STEAM_PLAYERS_URL) return Promise.reject(new Error('Network error'));
				if (url === FOXHOLE_WAR_URL) {
					return Promise.resolve({
						ok: true,
						json: () => Promise.resolve({ warNumber: 132, winner: 'NONE', requiredVictoryTowns: 32 }),
					});
				}
				return Promise.resolve({ ok: false });
			});

		const interaction = mockInteraction();
		await foxholeCommand.execute(interaction);

		const embed = interaction.editReply.mock.calls[0][0].embeds[0];
		const embedData = embed.data ?? embed;
		const playersField = (embedData.fields ?? []).find(f => f.name === 'FOXHOLE_PLAYERS_CURRENT');
		expect(playersField).toBeDefined();
		expect(playersField.value).toBe('FOXHOLE_UNAVAILABLE');
	});

	it('should show FOXHOLE_UNAVAILABLE for war when War API returns non-ok', async () => {
		mockFetch
			.mockImplementation((url) => {
				if (url === STEAM_PLAYERS_URL) {
					return Promise.resolve({
						ok: true,
						json: () => Promise.resolve({ response: { player_count: 1000 } }),
					});
				}
				if (url === FOXHOLE_WAR_URL) return Promise.resolve({ ok: false });
				return Promise.resolve({ ok: false });
			});

		const interaction = mockInteraction();
		await foxholeCommand.execute(interaction);

		const embed = interaction.editReply.mock.calls[0][0].embeds[0];
		const embedData = embed.data ?? embed;
		const warField = (embedData.fields ?? []).find(f => f.name === 'FOXHOLE_WAR_TITLE');
		expect(warField).toBeDefined();
		expect(warField.value).toBe('FOXHOLE_UNAVAILABLE');
	});

	it('should set FOXHOLE_ALL_UNAVAILABLE description when both APIs fail', async () => {
		mockFetch.mockResolvedValue({ ok: false });

		const interaction = mockInteraction();
		await foxholeCommand.execute(interaction);

		const embed = interaction.editReply.mock.calls[0][0].embeds[0];
		const embedData = embed.data ?? embed;
		expect(embedData.description).toBe('FOXHOLE_ALL_UNAVAILABLE');
	});

	it('should handle Steam invalid JSON shape (no player_count)', async () => {
		mockFetch
			.mockImplementation((url) => {
				if (url === STEAM_PLAYERS_URL) {
					return Promise.resolve({
						ok: true,
						json: () => Promise.resolve({ response: {} }),
					});
				}
				if (url === FOXHOLE_WAR_URL) {
					return Promise.resolve({
						ok: true,
						json: () => Promise.resolve({ warNumber: 132, winner: 'NONE' }),
					});
				}
				return Promise.resolve({ ok: false });
			});

		const interaction = mockInteraction();
		await foxholeCommand.execute(interaction);

		const embed = interaction.editReply.mock.calls[0][0].embeds[0];
		const embedData = embed.data ?? embed;
		const playersField = (embedData.fields ?? []).find(f => f.name === 'FOXHOLE_PLAYERS_CURRENT');
		expect(playersField.value).toBe('FOXHOLE_UNAVAILABLE');
	});
});
