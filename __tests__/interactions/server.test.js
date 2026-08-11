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

jest.mock('../../utils/orderBoardLog.js', () => ({
	deleteAllOrderLogThreads: jest.fn().mockResolvedValue(undefined),
	ensureAllOrderLogThreads: jest.fn().mockResolvedValue({ created: 0, skipped: 0 }),
}));

const mockPreviewServerWarData = jest.fn().mockResolvedValue({ boards: 1, stockpiles: 2, operations: 3 });
jest.mock('../../utils/serverReset.js', () => ({
	previewServerWarData: (...args) => mockPreviewServerWarData(...args),
	resetServerWarData: jest.fn(),
}));

const mockGetWarStatusSummary = jest.fn();
jest.mock('../../utils/foxholeWarApi.js', () => ({
	getWarStatusSummary: (...args) => mockGetWarStatusSummary(...args),
}));

describe('Slash command /server', () => {
	let serverCommand;
	let deleteAllOrderLogThreads;
	let ensureAllOrderLogThreads;

	beforeEach(() => {
		jest.resetModules();
		jest.clearAllMocks();
		mockPreviewServerWarData.mockResolvedValue({ boards: 1, stockpiles: 2, operations: 3 });
		mockGetWarStatusSummary.mockResolvedValue({ available: false });
		serverCommand = require('../../interactions/slash/server/server.js');
		({ deleteAllOrderLogThreads, ensureAllOrderLogThreads } = require('../../utils/orderBoardLog.js'));
	});

	function createInteraction(subcommand, options = {}) {
		const guild = { id: 'guild-123', name: 'Test Guild' };
		return {
			client: { traductions: new Map(), channels: { fetch: jest.fn() } },
			member: {
				guild,
				permissions: {
					has: jest.fn().mockReturnValue(options.canManage !== false),
				},
			},
			options: {
				getSubcommand: () => subcommand,
				getString: (name) => options[name] ?? null,
				getBoolean: (name) => (name in options ? options[name] : null),
			},
			reply: jest.fn().mockResolvedValue(undefined),
			deferReply: jest.fn().mockResolvedValue(undefined),
			editReply: jest.fn().mockResolvedValue(undefined),
		};
	}

	it('a la structure data avec subcommands infos, lang, camp, logs, reset', () => {
		expect(serverCommand.data.name).toBe('server');
		const subcommands = serverCommand.data.options ?? [];
		expect(subcommands.some((opt) => opt.name === 'infos')).toBe(true);
		expect(subcommands.some((opt) => opt.name === 'lang')).toBe(true);
		expect(subcommands.some((opt) => opt.name === 'camp')).toBe(true);
		expect(subcommands.some((opt) => opt.name === 'logs')).toBe(true);
		expect(subcommands.some((opt) => opt.name === 'reset')).toBe(true);
	});

	it('reset n\'a plus d\'option confirm', () => {
		const reset = serverCommand.data.options.find((opt) => opt.name === 'reset');
		expect(reset.options ?? []).toHaveLength(0);
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
			{ returnDocument: 'after' },
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
			{ returnDocument: 'after' },
		);
		expect(interaction.reply).toHaveBeenCalledWith({
			content: expect.stringContaining('SERVER_SET_CAMP_REPLY'),
			flags: 64,
		});
	});

	it('subcommand logs enabled: active et backfill les threads', async () => {
		mockServerFindOne.mockResolvedValue({ guild_id: 'guild-123', lang: 'en', camp: 'warden', logs: false });
		mockServerFindOneAndUpdate.mockResolvedValue({ logs: true });
		const interaction = createInteraction('logs', { enabled: true });

		await serverCommand.execute(interaction);

		expect(mockServerFindOneAndUpdate).toHaveBeenCalledWith(
			{ guild_id: 'guild-123' },
			{ logs: true },
			{ returnDocument: 'after' },
		);
		expect(deleteAllOrderLogThreads).not.toHaveBeenCalled();
		expect(ensureAllOrderLogThreads).toHaveBeenCalledWith(interaction.client, 'guild-123');
		expect(interaction.reply).toHaveBeenCalledWith({
			content: 'SERVER_SET_LOGS_ON_REPLY',
			flags: 64,
		});
	});

	it('subcommand logs disabled: désactive et purge les threads', async () => {
		mockServerFindOne.mockResolvedValue({ guild_id: 'guild-123', lang: 'en', camp: 'warden', logs: true });
		mockServerFindOneAndUpdate.mockResolvedValue({ logs: false });
		const interaction = createInteraction('logs', { enabled: false });

		await serverCommand.execute(interaction);

		expect(mockServerFindOneAndUpdate).toHaveBeenCalledWith(
			{ guild_id: 'guild-123' },
			{ logs: false },
			{ returnDocument: 'after' },
		);
		expect(deleteAllOrderLogThreads).toHaveBeenCalledWith(interaction.client, 'guild-123');
		expect(interaction.reply).toHaveBeenCalledWith({
			content: 'SERVER_SET_LOGS_OFF_REPLY',
			flags: 64,
		});
	});

	it('subcommand reset: refuse sans permission', async () => {
		mockServerFindOne.mockResolvedValue({ guild_id: 'guild-123', lang: 'en', camp: 'warden' });
		const interaction = createInteraction('reset', { canManage: false });

		await serverCommand.execute(interaction);

		expect(mockPreviewServerWarData).not.toHaveBeenCalled();
		expect(interaction.reply).toHaveBeenCalledWith({
			content: 'NO_PERMS',
			flags: 64,
		});
	});

	it('subcommand reset: aperçu + boutons sans alerte war si guerre inactive', async () => {
		mockServerFindOne.mockResolvedValue({ guild_id: 'guild-123', lang: 'en', camp: 'warden' });
		mockGetWarStatusSummary.mockResolvedValue({ available: true, ended: true, warNumber: 120, dayOfWar: 40 });
		const interaction = createInteraction('reset');

		await serverCommand.execute(interaction);

		expect(mockPreviewServerWarData).toHaveBeenCalledWith('guild-123');
		const payload = interaction.reply.mock.calls[0][0];
		expect(payload.content).toContain('SERVER_RESET_PREVIEW');
		expect(payload.content).not.toContain('SERVER_RESET_WAR_WARNING');
		expect(payload.flags).toBe(64);
		expect(payload.components).toHaveLength(1);
		const buttons = payload.components[0].components;
		expect(buttons).toHaveLength(2);
		expect(buttons[0].data.custom_id).toBe('server_reset_confirm');
		expect(buttons[1].data.custom_id).toBe('server_reset_cancel');
	});

	it('subcommand reset: alerte war si guerre en cours', async () => {
		mockServerFindOne.mockResolvedValue({ guild_id: 'guild-123', lang: 'en', camp: 'warden' });
		mockGetWarStatusSummary.mockResolvedValue({
			available: true,
			ended: false,
			warNumber: 126,
			dayOfWar: 8,
		});
		const interaction = createInteraction('reset');

		await serverCommand.execute(interaction);

		const payload = interaction.reply.mock.calls[0][0];
		expect(payload.content).toContain('SERVER_RESET_WAR_WARNING');
		expect(payload.content).toContain('SERVER_RESET_PREVIEW');
		expect(payload.components).toHaveLength(1);
	});

	it('subcommand reset: utilise ? si dayOfWar absent', async () => {
		mockServerFindOne.mockResolvedValue({ guild_id: 'guild-123', lang: 'en', camp: 'warden' });
		mockGetWarStatusSummary.mockResolvedValue({
			available: true,
			ended: false,
			warNumber: 126,
		});
		const interaction = createInteraction('reset');

		await serverCommand.execute(interaction);

		const payload = interaction.reply.mock.calls[0][0];
		expect(payload.content).toContain('SERVER_RESET_WAR_WARNING');
		expect(payload.content).toContain('"day":"?"');
	});

	it('subcommand reset: ignore l\'erreur war API et affiche l\'aperçu', async () => {
		mockServerFindOne.mockResolvedValue({ guild_id: 'guild-123', lang: 'en', camp: 'warden' });
		mockGetWarStatusSummary.mockRejectedValue(new Error('war api down'));
		const interaction = createInteraction('reset');

		await serverCommand.execute(interaction);

		const payload = interaction.reply.mock.calls[0][0];
		expect(payload.content).toContain('SERVER_RESET_PREVIEW');
		expect(payload.content).not.toContain('SERVER_RESET_WAR_WARNING');
		expect(payload.components).toHaveLength(1);
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
