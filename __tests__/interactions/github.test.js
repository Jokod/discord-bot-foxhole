const mockTranslate = jest.fn((key, params) => (params?.url ? `${key}: ${params.url}` : key));

jest.mock('../../utils/translations.js', () => jest.fn().mockImplementation(() => ({ translate: mockTranslate })));

describe('Slash command /github', () => {
	let githubCommand;
	const originalEnv = process.env;

	beforeEach(() => {
		jest.resetModules();
		process.env = { ...originalEnv };
		githubCommand = require('../../interactions/slash/misc/github.js');
	});

	afterAll(() => {
		process.env = originalEnv;
	});

	it('a la structure data et execute', () => {
		expect(githubCommand.data.name).toBe('github');
		expect(typeof githubCommand.execute).toBe('function');
	});

	it('répond avec le lien GitHub si GITHUB_URL est configuré', async () => {
		process.env.GITHUB_URL = 'https://github.com/example/bot';
		jest.resetModules();
		githubCommand = require('../../interactions/slash/misc/github.js');

		const interaction = {
			guild: { id: 'guild-123' },
			client: {},
			reply: jest.fn().mockResolvedValue(undefined),
		};

		await githubCommand.execute(interaction);

		expect(interaction.reply).toHaveBeenCalledWith({
			content: expect.stringContaining('https://github.com/example/bot'),
			flags: 64,
		});
	});

	it('répond GITHUB_NOT_CONFIGURED si GITHUB_URL est vide', async () => {
		delete process.env.GITHUB_URL;
		jest.resetModules();
		githubCommand = require('../../interactions/slash/misc/github.js');

		const interaction = {
			guild: { id: 'guild-123' },
			client: {},
			reply: jest.fn().mockResolvedValue(undefined),
		};

		await githubCommand.execute(interaction);

		expect(interaction.reply).toHaveBeenCalledWith({
			content: 'GITHUB_NOT_CONFIGURED',
			flags: 64,
		});
	});
});
