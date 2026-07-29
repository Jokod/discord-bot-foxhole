const mockTranslate = jest.fn((key, params) => (params?.url ? `${key}: ${params.url}` : key));

jest.mock('../../utils/translations.js', () => jest.fn().mockImplementation(() => ({ translate: mockTranslate })));

describe('Slash command /about', () => {
	let aboutCommand;
	const originalEnv = process.env;

	beforeEach(() => {
		jest.resetModules();
		process.env = { ...originalEnv };
		delete process.env.GITHUB_URL;
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

	it('répond avec GitHub et Discord si les deux sont configurés', async () => {
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
		expect(content).toContain('https://discord.gg/bjkzG9YsX5');
		expect(content).toContain('ABOUT_MESSAGE');
		expect(interaction.reply).toHaveBeenCalledWith(expect.objectContaining({ flags: 64 }));
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
