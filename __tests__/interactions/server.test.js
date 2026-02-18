const mockTranslate = jest.fn((key, params) => (params ? `${key}_${JSON.stringify(params)}` : key));
const mockServerFindOne = jest.fn();
const mockServerFindOneAndUpdate = jest.fn();

jest.mock('../../utils/translations.js', () => jest.fn().mockImplementation(() => ({ translate: mockTranslate })));
jest.mock('../../data/models.js', () => ({
	Server: {
		findOne: (...args) => mockServerFindOne(...args),
		findOneAndUpdate: (...args) => mockServerFindOneAndUpdate(...args),
	},
}));

describe('Slash command /server', () => {
	let serverCommand;

	beforeEach(() => {
		jest.resetModules();
		jest.clearAllMocks();
		serverCommand = require('../../interactions/slash/server/server.js');
	});

	function createInteraction(subcommand, options = {}) {
		const guild = { id: 'guild-123', name: 'Test Guild' };
		return {
			client: { traductions: new Map() },
			member: { guild },
			options: {
				getSubcommand: () => subcommand,
				getString: (name) => options[name] ?? null,
			},
			reply: jest.fn().mockResolvedValue(undefined),
		};
	}

	it('a la structure data avec subcommands infos, lang, camp', () => {
		expect(serverCommand.data.name).toBe('server');
		const subcommands = serverCommand.data.options ?? [];
		expect(subcommands.some((opt) => opt.name === 'infos')).toBe(true);
		expect(subcommands.some((opt) => opt.name === 'lang')).toBe(true);
		expect(subcommands.some((opt) => opt.name === 'camp')).toBe(true);
	});

	it('répond SERVER_IS_NOT_INIT si le serveur n\'existe pas', async () => {
		mockServerFindOne.mockResolvedValue(null);
		const interaction = createInteraction('infos');

		await serverCommand.execute(interaction);

		expect(interaction.reply).toHaveBeenCalledWith({
			content: 'SERVER_IS_NOT_INIT',
			flags: 64,
		});
	});

	it('subcommand infos: répond avec un embed de configuration', async () => {
		mockServerFindOne.mockResolvedValue({ guild_id: 'guild-123', lang: 'en', camp: 'warden' });
		const interaction = createInteraction('infos');

		await serverCommand.execute(interaction);

		expect(interaction.reply).toHaveBeenCalledWith({
			embeds: [expect.any(Object)],
			flags: 64,
		});
		const embed = interaction.reply.mock.calls[0][0].embeds[0];
		expect(embed.data?.fields ?? embed.fields).toBeDefined();
	});

	it('subcommand lang: met à jour la langue et traductions', async () => {
		mockServerFindOne.mockResolvedValue({ guild_id: 'guild-123', lang: 'en', camp: 'warden' });
		mockServerFindOneAndUpdate.mockResolvedValue({ guild_id: 'guild-123', lang: 'fr' });
		const interaction = createInteraction('lang', { lang: 'fr' });

		await serverCommand.execute(interaction);

		expect(mockServerFindOneAndUpdate).toHaveBeenCalledWith(
			{ guild_id: 'guild-123' },
			{ lang: 'fr' },
			{ new: true },
		);
		expect(interaction.client.traductions.get('guild-123')).toBe('fr');
		expect(interaction.reply).toHaveBeenCalledWith({
			content: expect.stringContaining('SERVER_SET_LANG_REPLY'),
			flags: 64,
		});
	});

	it('subcommand camp: met à jour le camp', async () => {
		mockServerFindOne.mockResolvedValue({ guild_id: 'guild-123', lang: 'en', camp: 'warden' });
		mockServerFindOneAndUpdate.mockResolvedValue({ guild_id: 'guild-123', camp: 'colonial' });
		const interaction = createInteraction('camp', { camp: 'colonial' });

		await serverCommand.execute(interaction);

		expect(mockServerFindOneAndUpdate).toHaveBeenCalledWith(
			{ guild_id: 'guild-123' },
			{ camp: 'colonial' },
			{ new: true },
		);
		expect(interaction.reply).toHaveBeenCalledWith({
			content: expect.stringContaining('SERVER_SET_CAMP_REPLY'),
			flags: 64,
		});
	});

	it('répond COMMAND_UNKNOWN pour un subcommand inconnu', async () => {
		mockServerFindOne.mockResolvedValue({ guild_id: 'guild-123', lang: 'en', camp: 'warden' });
		const interaction = createInteraction('unknown');

		await serverCommand.execute(interaction);

		expect(interaction.reply).toHaveBeenCalledWith({
			content: 'COMMAND_UNKNOWN',
			flags: 64,
		});
	});
});
