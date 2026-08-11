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
		slashCommands.set('about', {
			data: {
				name: 'about',
				toJSON: () => ({
					name: 'about',
					description: 'Bot links',
					name_localizations: { fr: 'a-propos', en: 'about' },
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

	it('a la structure data avec option command autocomplete', () => {
		expect(helpCommand.data.name).toBe('help');
		const options = helpCommand.data.options ?? [];
		const commandOpt = options.find((opt) => opt.name === 'command');
		expect(commandOpt).toBeDefined();
		expect(commandOpt.autocomplete).toBe(true);
	});

	it('sans option: affiche la liste enrichie avec descriptions et hint', async () => {
		const interaction = createInteraction(null);

		await helpCommand.execute(interaction);

		expect(interaction.reply).toHaveBeenCalledWith({
			embeds: [expect.objectContaining({
				data: expect.objectContaining({
					title: 'HELP_TITLE_LIST',
					description: expect.stringMatching(/about[\s\S]*HELP_LIST_HINT/),
				}),
			})],
			flags: 64,
		});
		const embed = interaction.reply.mock.calls[0][0].embeds[0];
		const desc = embed.data?.description ?? embed.description;
		expect(desc).toContain('Bot links');
	});

	it('avec commande inconnue: HELP_COMMAND_NOT_FOUND + hint', async () => {
		const interaction = createInteraction('nonexistent');

		await helpCommand.execute(interaction);

		const embed = interaction.reply.mock.calls[0][0].embeds[0];
		const desc = embed.data?.description ?? embed.description;
		expect(desc).toContain('HELP_COMMAND_NOT_FOUND');
		expect(desc).toContain('HELP_NOT_FOUND_HINT');
		expect(embed.data?.color ?? embed.color).toBe(0xFF0000);
	});

	it('avec commande connue par nom: affiche l\'aide', async () => {
		const interaction = createInteraction('about');

		await helpCommand.execute(interaction);

		const embed = interaction.reply.mock.calls[0][0].embeds[0];
		expect(embed.data?.title ?? embed.title).toContain('HELP_TITLE_COMMAND');
		expect(embed.data?.description ?? embed.description).toContain('Bot links');
	});

	it('avec préfixe /: normalise correctement', async () => {
		const interaction = createInteraction('/about');

		await helpCommand.execute(interaction);

		expect(interaction.reply).toHaveBeenCalledWith({
			embeds: [expect.any(Object)],
			flags: 64,
		});
		const embed = interaction.reply.mock.calls[0][0].embeds[0];
		expect(embed.data?.description ?? embed.description).toContain('Bot links');
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
		const fields = embed.data?.fields ?? embed.fields ?? [];
		const paramsField = fields.find((f) => f.name === 'HELP_SECTION_PARAMETERS');
		expect(paramsField).toBeDefined();
		expect(paramsField.value).toContain('lang');
		expect(fields.some((f) => f.name === 'HELP_SECTION_USAGE')).toBe(true);
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
		const fields = embed.data?.fields ?? [];
		expect(fields.every((f) => f.name !== 'HELP_SECTION_PARAMETERS')).toBe(true);
	});

	it('affiche l\'aide de base avec paramètres pour la commande help elle-même', async () => {
		const interaction = createInteraction('help');

		await helpCommand.execute(interaction);

		const embed = interaction.reply.mock.calls[0][0].embeds[0];
		const fields = embed.data?.fields ?? embed.fields ?? [];
		expect(fields.some((f) => f.name === 'HELP_SECTION_PARAMETERS')).toBe(true);
		expect(fields.some((f) => f.name === 'HELP_SECTION_USAGE')).toBe(true);
		expect(fields.every((f) => f.name !== 'HELP_SECTION_SUBCOMMANDS')).toBe(true);
	});

	it('order create: affiche choices, required, autocomplete et usage', async () => {
		const orderCmd = require('../../interactions/slash/order/order.js');
		const interaction = createInteraction('order create');
		interaction.client.slashCommands.set('order', orderCmd);

		await helpCommand.execute(interaction);

		const embed = interaction.reply.mock.calls[0][0].embeds[0];
		const fields = embed.data?.fields ?? [];
		const params = fields.find((f) => f.name === 'HELP_SECTION_PARAMETERS');
		const usage = fields.find((f) => f.name === 'HELP_SECTION_USAGE');
		expect(params).toBeDefined();
		expect(params.value).toContain('type');
		expect(params.value).toContain('name');
		expect(params.value).toContain('HELP_PARAM_CHOICES');
		expect(params.value).toContain('HELP_PARAM_REQUIRED_SUFFIX');
		expect(params.value).toContain('HELP_PARAM_AUTOCOMPLETE');
		expect(usage?.value).toContain('/order');
		expect(usage?.value).toContain('create');
	});

	it('order créer (FR): résout la sous-commande localisée', async () => {
		const orderCmd = require('../../interactions/slash/order/order.js');
		const interaction = createInteraction('commande créer');
		interaction.client.traductions.set('guild-123', 'fr');
		interaction.client.slashCommands.set('order', orderCmd);

		await helpCommand.execute(interaction);

		const embed = interaction.reply.mock.calls[0][0].embeds[0];
		const desc = embed.data?.description ?? embed.description;
		expect(desc).toMatch(/tableau|Créer|create/i);
		const fields = embed.data?.fields ?? [];
		expect(fields.some((f) => f.name === 'HELP_SECTION_PARAMETERS')).toBe(true);
	});

	it('order parent: sous-commandes avec hint params, sans section params vide', async () => {
		const orderCmd = require('../../interactions/slash/order/order.js');
		const interaction = createInteraction('order');
		interaction.client.slashCommands.set('order', orderCmd);

		await helpCommand.execute(interaction);

		const embed = interaction.reply.mock.calls[0][0].embeds[0];
		const fields = embed.data?.fields ?? [];
		const subs = fields.find((f) => f.name === 'HELP_SECTION_SUBCOMMANDS');
		expect(subs).toBeDefined();
		expect(subs.value).toContain('create');
		expect(subs.value).toContain('`type`*');
		expect(fields.every((f) => f.name !== 'HELP_SECTION_PARAMETERS')).toBe(true);
	});

	it('HELP_COMMAND_NOT_FOUND si le chemin sous-commande dépasse 2 niveaux', async () => {
		const { ApplicationCommandOptionType } = require('discord.js');
		const mockCmd = {
			data: {
				toJSON: () => ({
					name: 'deep',
					description: 'Deep command',
					options: [
						{
							type: ApplicationCommandOptionType.SubcommandGroup,
							name: 'grp',
							options: [
								{
									type: ApplicationCommandOptionType.Subcommand,
									name: 'sub',
									description: 'Sub',
								},
							],
						},
					],
				}),
			},
		};
		const interaction = createInteraction('deep grp sub extra');
		interaction.client.slashCommands.set('deep', mockCmd);

		await helpCommand.execute(interaction);

		const embed = interaction.reply.mock.calls[0][0].embeds[0];
		expect(embed.data?.description ?? embed.description).toContain('HELP_COMMAND_NOT_FOUND');
	});

	it('résout la commande par nom normalisé (sans clé directe dans la Collection)', async () => {
		const interaction = createInteraction('about');
		interaction.client.slashCommands.delete('about');
		interaction.client.slashCommands.set('about-cmd', {
			data: {
				toJSON: () => ({
					name: 'about',
					description: 'Bot links via normalized lookup',
					options: [],
				}),
			},
		});

		await helpCommand.execute(interaction);

		const embed = interaction.reply.mock.calls[0][0].embeds[0];
		expect(embed.data?.description ?? embed.description).toContain('Bot links via normalized lookup');
	});

	it('parent avec SubcommandGroup: liste les sous-commandes du groupe', async () => {
		const { ApplicationCommandOptionType } = require('discord.js');
		const mockCmd = {
			data: {
				toJSON: () => ({
					name: 'grouped',
					description: 'Grouped parent',
					options: [
						{
							type: ApplicationCommandOptionType.SubcommandGroup,
							name: 'admin',
							description: 'Admin group',
							options: [
								{
									type: ApplicationCommandOptionType.Subcommand,
									name: 'reset',
									description: 'Reset things',
									options: [{ name: 'force', required: true }],
								},
							],
						},
					],
				}),
			},
		};
		const interaction = createInteraction('grouped');
		interaction.client.slashCommands.set('grouped', mockCmd);

		await helpCommand.execute(interaction);

		const embed = interaction.reply.mock.calls[0][0].embeds[0];
		const fields = embed.data?.fields ?? embed.fields ?? [];
		const subs = fields.find((f) => f.name === 'HELP_SECTION_SUBCOMMANDS');
		expect(subs).toBeDefined();
		expect(subs.value).toContain('admin');
		expect(subs.value).toContain('reset');
		expect(subs.value).toContain('Reset things');
		expect(subs.value).toContain('`force`*');
	});

	it('paramètre booléen: HELP_PARAM_BOOLEAN dans params et usage', async () => {
		const { ApplicationCommandOptionType } = require('discord.js');
		const mockCmd = {
			data: {
				toJSON: () => ({
					name: 'flags',
					description: 'Flags command',
					options: [
						{
							type: ApplicationCommandOptionType.Boolean,
							name: 'enabled',
							description: 'Toggle feature',
							required: false,
						},
					],
				}),
			},
		};
		const interaction = createInteraction('flags');
		interaction.client.slashCommands.set('flags', mockCmd);

		await helpCommand.execute(interaction);

		const embed = interaction.reply.mock.calls[0][0].embeds[0];
		const fields = embed.data?.fields ?? [];
		const params = fields.find((f) => f.name === 'HELP_SECTION_PARAMETERS');
		const usage = fields.find((f) => f.name === 'HELP_SECTION_USAGE');
		expect(params.value).toContain('HELP_PARAM_BOOLEAN');
		expect(usage.value).toContain('HELP_PARAM_BOOLEAN');
	});

	it('paramètre avec min/max length: HELP_PARAM_LENGTH', async () => {
		const { ApplicationCommandOptionType } = require('discord.js');
		const mockCmd = {
			data: {
				toJSON: () => ({
					name: 'textcmd',
					description: 'Text command',
					options: [
						{
							type: ApplicationCommandOptionType.String,
							name: 'label',
							description: 'A label',
							required: true,
							min_length: 2,
							max_length: 50,
						},
					],
				}),
			},
		};
		const interaction = createInteraction('textcmd');
		interaction.client.slashCommands.set('textcmd', mockCmd);

		await helpCommand.execute(interaction);

		const embed = interaction.reply.mock.calls[0][0].embeds[0];
		const fields = embed.data?.fields ?? [];
		const params = fields.find((f) => f.name === 'HELP_SECTION_PARAMETERS');
		expect(params.value).toContain('HELP_PARAM_LENGTH');
	});

	it('résout par name_localizations dans resolveSlashCommand', async () => {
		const interaction = createInteraction('a-propos');
		interaction.client.traductions.set('guild-123', 'fr');
		interaction.client.slashCommands.delete('about');
		interaction.client.slashCommands.set('about-cmd', {
			data: {
				toJSON: () => ({
					name: 'about',
					description: 'Liens du bot',
					name_localizations: { fr: 'a-propos' },
					options: [],
				}),
			},
		});

		await helpCommand.execute(interaction);

		const embed = interaction.reply.mock.calls[0][0].embeds[0];
		expect(embed.data?.description ?? embed.description).toContain('Liens du bot');
	});

	it('commande sans description: affiche un tiret', async () => {
		const interaction = createInteraction('nodesc');
		interaction.client.slashCommands.set('nodesc', {
			data: {
				toJSON: () => ({ name: 'nodesc', description: '', options: [] }),
			},
		});

		await helpCommand.execute(interaction);

		const embed = interaction.reply.mock.calls[0][0].embeds[0];
		expect(embed.data?.description ?? embed.description).toBe('—');
	});

	it('sous-commande group introuvable: HELP_COMMAND_NOT_FOUND', async () => {
		const { ApplicationCommandOptionType } = require('discord.js');
		const mockCmd = {
			data: {
				toJSON: () => ({
					name: 'grp',
					description: 'Group cmd',
					options: [
						{
							type: ApplicationCommandOptionType.SubcommandGroup,
							name: 'admin',
							options: [],
						},
					],
				}),
			},
		};
		const interaction = createInteraction('grp admin missing');
		interaction.client.slashCommands.set('grp', mockCmd);

		await helpCommand.execute(interaction);

		const embed = interaction.reply.mock.calls[0][0].embeds[0];
		expect(embed.data?.description ?? embed.description).toContain('HELP_COMMAND_NOT_FOUND');
	});

	it('paramètre optionnel sans extras ni choices', async () => {
		const { ApplicationCommandOptionType } = require('discord.js');
		const mockCmd = {
			data: {
				toJSON: () => ({
					name: 'plain',
					description: 'Plain command',
					options: [
						{
							type: ApplicationCommandOptionType.String,
							name: 'note',
							description: 'Optional note',
							required: false,
						},
					],
				}),
			},
		};
		const interaction = createInteraction('plain');
		interaction.client.slashCommands.set('plain', mockCmd);

		await helpCommand.execute(interaction);

		const embed = interaction.reply.mock.calls[0][0].embeds[0];
		const fields = embed.data?.fields ?? [];
		const params = fields.find((f) => f.name === 'HELP_SECTION_PARAMETERS');
		const usage = fields.find((f) => f.name === 'HELP_SECTION_USAGE');
		expect(params.value).toContain('note');
		expect(params.value).not.toContain('HELP_PARAM_CHOICES');
		expect(usage.value).toContain('[note:<…>]');
	});

	it('paramètre avec seulement min_length', async () => {
		const { ApplicationCommandOptionType } = require('discord.js');
		const mockCmd = {
			data: {
				toJSON: () => ({
					name: 'minonly',
					description: 'Min only',
					options: [{
						type: ApplicationCommandOptionType.String,
						name: 'code',
						description: 'Code',
						required: true,
						min_length: 3,
					}],
				}),
			},
		};
		const interaction = createInteraction('minonly');
		interaction.client.slashCommands.set('minonly', mockCmd);

		await helpCommand.execute(interaction);

		const fields = interaction.reply.mock.calls[0][0].embeds[0].data?.fields ?? [];
		expect(fields.find((f) => f.name === 'HELP_SECTION_PARAMETERS').value).toContain('HELP_PARAM_LENGTH');
	});

	it('commande avec options undefined: pas de crash', async () => {
		const interaction = createInteraction('noopts');
		interaction.client.slashCommands.set('noopts', {
			data: { toJSON: () => ({ name: 'noopts', description: 'No options field' }) },
		});

		await helpCommand.execute(interaction);

		expect(interaction.reply).toHaveBeenCalled();
	});

	it('sous-commande sans params ni usage: pas de champs usage vides', async () => {
		const { ApplicationCommandOptionType } = require('discord.js');
		const mockCmd = {
			data: {
				toJSON: () => ({
					name: 'baresub',
					description: 'Bare parent',
					options: [{
						type: ApplicationCommandOptionType.Subcommand,
						name: 'ping',
						description: 'Ping sub',
						options: [],
					}],
				}),
			},
		};
		const interaction = createInteraction('baresub ping');
		interaction.client.slashCommands.set('baresub', mockCmd);

		await helpCommand.execute(interaction);

		const fields = interaction.reply.mock.calls[0][0].embeds[0].data?.fields ?? [];
		expect(fields.every((f) => f.name !== 'HELP_SECTION_PARAMETERS')).toBe(true);
		expect(fields.some((f) => f.name === 'HELP_SECTION_USAGE')).toBe(true);
	});

	it('parent SubcommandGroup: ignore les entrées non-subcommand dans le groupe', async () => {
		const { ApplicationCommandOptionType } = require('discord.js');
		const mockCmd = {
			data: {
				toJSON: () => ({
					name: 'mixed',
					description: 'Mixed parent',
					options: [{
						type: ApplicationCommandOptionType.SubcommandGroup,
						name: 'grp',
						description: 'Group',
						options: [
							{ type: ApplicationCommandOptionType.String, name: 'skip', description: 'skip' },
							{
								type: ApplicationCommandOptionType.Subcommand,
								name: 'keep',
								description: 'Keep me',
							},
						],
					}],
				}),
			},
		};
		const interaction = createInteraction('mixed');
		interaction.client.slashCommands.set('mixed', mockCmd);

		await helpCommand.execute(interaction);

		const subs = interaction.reply.mock.calls[0][0].embeds[0].data?.fields
			?.find((f) => f.name === 'HELP_SECTION_SUBCOMMANDS');
		expect(subs.value).toContain('keep');
		expect(subs.value).not.toContain('skip');
	});

	it('résout sous-commande par name_localizations (matchesName)', async () => {
		const serverCmd = require('../../interactions/slash/server/server.js');
		const interaction = createInteraction('server informations');
		interaction.client.traductions.set('guild-123', 'fr');
		interaction.client.slashCommands.set('server', serverCmd);

		await helpCommand.execute(interaction);

		const desc = interaction.reply.mock.calls[0][0].embeds[0].data?.description
			?? interaction.reply.mock.calls[0][0].embeds[0].description;
		expect(desc).toMatch(/configuration du serveur|Displays the server configuration/i);
	});

	it('parent avec SubcommandGroup sans options: HELP_NO_SUBCOMMANDS', async () => {
		const { ApplicationCommandOptionType } = require('discord.js');
		const mockCmd = {
			data: {
				toJSON: () => ({
					name: 'emptygroup',
					description: 'Empty group parent',
					options: [{
						type: ApplicationCommandOptionType.SubcommandGroup,
						name: 'admin',
						description: 'Empty admin group',
					}],
				}),
			},
		};
		const interaction = createInteraction('emptygroup');
		interaction.client.slashCommands.set('emptygroup', mockCmd);

		await helpCommand.execute(interaction);

		const subs = interaction.reply.mock.calls[0][0].embeds[0].data?.fields
			?.find((f) => f.name === 'HELP_SECTION_SUBCOMMANDS');
		expect(subs.value).toBe('HELP_NO_SUBCOMMANDS');
	});

	it('commande avec options undefined au niveau data', async () => {
		const interaction = createInteraction('nooptfield');
		interaction.client.slashCommands.set('nooptfield', {
			data: { toJSON: () => ({ name: 'nooptfield', description: 'No options key' }) },
		});

		await helpCommand.execute(interaction);

		expect(interaction.reply).toHaveBeenCalled();
	});

	it('sous-commande dans group sans options: HELP_COMMAND_NOT_FOUND', async () => {
		const { ApplicationCommandOptionType } = require('discord.js');
		const mockCmd = {
			data: {
				toJSON: () => ({
					name: 'nogrp',
					description: 'No group options',
					options: [{
						type: ApplicationCommandOptionType.SubcommandGroup,
						name: 'admin',
					}],
				}),
			},
		};
		const interaction = createInteraction('nogrp admin sub');
		interaction.client.slashCommands.set('nogrp', mockCmd);

		await helpCommand.execute(interaction);

		const embed = interaction.reply.mock.calls[0][0].embeds[0];
		expect(embed.data?.description ?? embed.description).toContain('HELP_COMMAND_NOT_FOUND');
	});

	it('paramètre avec seulement max_length', async () => {
		const { ApplicationCommandOptionType } = require('discord.js');
		const mockCmd = {
			data: {
				toJSON: () => ({
					name: 'maxonly',
					description: 'Max only',
					options: [{
						type: ApplicationCommandOptionType.String,
						name: 'label',
						description: 'Label',
						required: false,
						max_length: 20,
					}],
				}),
			},
		};
		const interaction = createInteraction('maxonly');
		interaction.client.slashCommands.set('maxonly', mockCmd);

		await helpCommand.execute(interaction);

		const params = interaction.reply.mock.calls[0][0].embeds[0].data?.fields
			?.find((f) => f.name === 'HELP_SECTION_PARAMETERS');
		expect(params.value).toContain('HELP_PARAM_LENGTH');
	});

	it('commande "/" seule: normalize("") sans crash', async () => {
		const interaction = createInteraction('/');

		await helpCommand.execute(interaction);

		const embed = interaction.reply.mock.calls[0][0].embeds[0];
		expect(embed.data?.description ?? embed.description).toContain('HELP_COMMAND_NOT_FOUND');
	});
});
