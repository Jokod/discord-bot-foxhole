const mockTranslate = jest.fn((key, params) => (params?.url ? `${key}: ${params.url}` : key));

jest.mock('../../utils/translations.js', () => jest.fn().mockImplementation(() => ({ translate: mockTranslate })));

describe('Slash command /about', () => {
	let aboutCommand;
	const originalEnv = process.env;

	beforeEach(() => {
		jest.resetModules();
		process.env = { ...originalEnv };
		delete process.env.GITHUB_URL;
		delete process.env.GITHUB_ISSUES_URL;
		delete process.env.DISCORD_INVITE_URL;
	});

	afterAll(() => {
		process.env = originalEnv;
	});

	function loadCommand() {
		aboutCommand = require('../../interactions/slash/misc/about.js');
	}

	it('a la structure data et execute', () => {
		loadCommand();
		expect(aboutCommand.data.name).toBe('about');
		expect(typeof aboutCommand.execute).toBe('function');
	});

	it('répond avec GitHub, issues et Discord si configurés', async () => {
		process.env.GITHUB_URL = 'https://github.com/example/bot';
		process.env.DISCORD_INVITE_URL = 'https://discord.gg/bjkzG9YsX5';
		loadCommand();

		const interaction = {
			guild: { id: 'guild-123' },
			client: {},
			reply: jest.fn().mockResolvedValue(undefined),
		};

		await aboutCommand.execute(interaction);

		const content = interaction.reply.mock.calls[0][0].content;
		expect(content).toContain('https://github.com/example/bot');
		expect(content).toContain('https://github.com/example/bot/issues/new');
		expect(content).toContain('ABOUT_ISSUES');
		expect(content).toContain('https://discord.gg/bjkzG9YsX5');
		expect(content).toContain('ABOUT_ANNOUNCEMENTS_FOLLOW');
		expect(content).toContain('ABOUT_MESSAGE');
		expect(interaction.reply).toHaveBeenCalledWith(expect.objectContaining({ flags: 64 }));
	});

	it('accepte GITHUB_ISSUES_URL en override', async () => {
		process.env.GITHUB_URL = 'https://github.com/example/bot';
		process.env.GITHUB_ISSUES_URL = 'https://github.com/example/bot/issues/new?template=bug.md';
		loadCommand();

		const interaction = {
			guild: { id: 'guild-123' },
			client: {},
			reply: jest.fn().mockResolvedValue(undefined),
		};

		await aboutCommand.execute(interaction);

		const content = interaction.reply.mock.calls[0][0].content;
		expect(content).toContain('https://github.com/example/bot/issues/new?template=bug.md');
	});

	it('répond ABOUT_NOT_CONFIGURED si aucun lien', async () => {
		loadCommand();

		const interaction = {
			guild: { id: 'guild-123' },
			client: {},
			reply: jest.fn().mockResolvedValue(undefined),
		};

		await aboutCommand.execute(interaction);

		expect(interaction.reply).toHaveBeenCalledWith({
			content: 'ABOUT_NOT_CONFIGURED',
			flags: 64,
		});
	});
});
