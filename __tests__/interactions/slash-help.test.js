const { Collection } = require('discord.js');

const mockTranslate = jest.fn((key, params) => (params ? `${key}` : key));
jest.mock('../../utils/translations.js', () => jest.fn().mockImplementation(() => ({ translate: mockTranslate })));
jest.mock('../../utils/colors.js', () => ({ getRandomColor: jest.fn().mockReturnValue(0x3498db) }));
jest.mock('../../utils/markdown.js', () => ({ safeEscapeMarkdown: (s) => s }));

describe('Slash command /help', () => {
	let helpCommand;

	beforeEach(() => {
		jest.resetModules();
		jest.clearAllMocks();
		helpCommand = require('../../interactions/slash/misc/help.js');
	});

	function createInteraction(commandOption = null) {
		const guildId = 'guild-123';
		const slashCommands = new Collection();
		slashCommands.set('github', {
			data: {
				toJSON: () => ({
					name: 'github',
					description: 'GitHub link',
					name_localizations: { fr: 'github', en: 'github' },
					options: [],
				}),
			},
		});
		slashCommands.set('help', helpCommand);

		return {
			guild: { id: guildId },
			client: {
				slashCommands,
				traductions: new Map([[guildId, 'en']]),
				languages: new Map([['en', {}], ['fr', {}]]),
			},
			options: {
				getString: (name) => (name === 'command' ? commandOption : null),
			},
			reply: jest.fn().mockResolvedValue(undefined),
		};
	}

	it('a la structure data avec option command', () => {
		expect(helpCommand.data.name).toBe('help');
		const options = helpCommand.data.options ?? [];
		expect(options.some((opt) => opt.name === 'command')).toBe(true);
	});

	it('sans option: affiche la liste de toutes les commandes', async () => {
		const interaction = createInteraction(null);

		await helpCommand.execute(interaction);

		expect(interaction.reply).toHaveBeenCalledWith({
			embeds: [expect.objectContaining({
				data: expect.objectContaining({
					title: 'HELP_TITLE_LIST',
					description: expect.stringContaining('github'),
				}),
			})],
			flags: 64,
		});
	});

	it('avec commande inconnue: HELP_COMMAND_NOT_FOUND', async () => {
		const interaction = createInteraction('nonexistent');

		await helpCommand.execute(interaction);

		const embed = interaction.reply.mock.calls[0][0].embeds[0];
		expect(embed.data?.description ?? embed.description).toContain('HELP_COMMAND_NOT_FOUND');
		expect(embed.data?.color ?? embed.color).toBe(0xFF0000);
	});

	it('avec commande connue par nom: affiche l\'aide', async () => {
		const interaction = createInteraction('github');

		await helpCommand.execute(interaction);

		const embed = interaction.reply.mock.calls[0][0].embeds[0];
		expect(embed.data?.title ?? embed.title).toContain('HELP_TITLE_COMMAND');
		expect(embed.data?.description ?? embed.description).toContain('GitHub link');
	});

	it('avec préfixe /: normalise correctement', async () => {
		const interaction = createInteraction('/github');

		await helpCommand.execute(interaction);

		expect(interaction.reply).toHaveBeenCalledWith({
			embeds: [expect.any(Object)],
			flags: 64,
		});
		const embed = interaction.reply.mock.calls[0][0].embeds[0];
		expect(embed.data?.description ?? embed.description).toContain('GitHub link');
	});

	it('utilise en si la langue courante est absente de languages', async () => {
		const interaction = createInteraction(null);
		interaction.client.traductions.set('guild-123', 'xx');
		interaction.client.languages = new Map([['en', {}]]);

		await helpCommand.execute(interaction);

		expect(interaction.reply).toHaveBeenCalled();
	});

	it('gère guild null (DM)', async () => {
		const interaction = createInteraction(null);
		interaction.guild = null;

		await helpCommand.execute(interaction);

		expect(interaction.reply).toHaveBeenCalled();
	});

	it('résout la commande par nom localisé (ex: aide pour help)', async () => {
		const interaction = createInteraction('aide');
		interaction.client.traductions.set('guild-123', 'fr');

		await helpCommand.execute(interaction);

		const embed = interaction.reply.mock.calls[0][0].embeds[0];
		expect(embed.data?.description ?? embed.description).toBeDefined();
	});

	it('affiche l\'aide pour une sous-commande spécifique', async () => {
		const serverCmd = require('../../interactions/slash/server/server.js');
		const interaction = createInteraction('server infos');
		interaction.client.slashCommands.set('server', serverCmd);

		await helpCommand.execute(interaction);

		const embed = interaction.reply.mock.calls[0][0].embeds[0];
		const desc = embed.data?.description ?? embed.description;
		expect(desc).toContain('Displays the server configuration');
		expect(desc).toContain('HELP_SECTION_PARAMETERS');
	});

	it('affiche HELP_COMMAND_NOT_FOUND quand la sous-commande n\'existe pas', async () => {
		const serverCmd = require('../../interactions/slash/server/server.js');
		const interaction = createInteraction('server unknown_subcommand');
		interaction.client.slashCommands.set('server', serverCmd);

		await helpCommand.execute(interaction);

		const embed = interaction.reply.mock.calls[0][0].embeds[0];
		expect(embed.data?.description ?? embed.description).toContain('HELP_COMMAND_NOT_FOUND');
		expect(embed.data?.color ?? embed.color).toBe(0xFF0000);
	});

	it('affiche les paramètres pour une sous-commande avec options (ex: server lang)', async () => {
		const serverCmd = require('../../interactions/slash/server/server.js');
		const interaction = createInteraction('server lang');
		interaction.client.slashCommands.set('server', serverCmd);

		await helpCommand.execute(interaction);

		const embed = interaction.reply.mock.calls[0][0].embeds[0];
		const desc = embed.data?.description ?? embed.description;
		expect(desc).toContain('HELP_SECTION_PARAMETERS');
		expect(desc).toContain('lang');
	});

	it('résout une sous-commande dans un SubcommandGroup (group sub)', async () => {
		const { ApplicationCommandOptionType } = require('discord.js');
		const mockCmdWithGroup = {
			data: {
				toJSON: () => ({
					name: 'mockgroup',
					description: 'Mock command with group',
					options: [
						{
							type: ApplicationCommandOptionType.SubcommandGroup,
							name: 'mygroup',
							options: [
								{
									type: ApplicationCommandOptionType.Subcommand,
									name: 'mysub',
									description: 'Sub in group',
								},
							],
						},
					],
				}),
			},
		};
		const interaction = createInteraction('mockgroup mygroup mysub');
		interaction.client.slashCommands.set('mockgroup', mockCmdWithGroup);

		await helpCommand.execute(interaction);

		const embed = interaction.reply.mock.calls[0][0].embeds[0];
		const desc = embed.data?.description ?? embed.description;
		expect(desc).toContain('Sub in group');
		expect(desc).toContain('HELP_NO_PARAMS');
	});

	it('affiche l\'aide de base avec sous-commandes et paramètres pour la commande help elle-même', async () => {
		const interaction = createInteraction('help');

		await helpCommand.execute(interaction);

		const embed = interaction.reply.mock.calls[0][0].embeds[0];
		const desc = embed.data?.description ?? embed.description;
		expect(desc).toContain('HELP_SECTION_SUBCOMMANDS');
		expect(desc).toContain('HELP_SECTION_PARAMETERS');
	});
});
