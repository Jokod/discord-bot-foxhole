const mockTranslate = jest.fn((key) => key);

jest.mock('../../utils/translations.js', () => {
	const fn = jest.fn();
	fn.mockImplementation(() => ({ translate: mockTranslate }));
	return fn;
});

// Mock du modèle Server pour supporter `new Server(...)` et `Server.findOne`
jest.mock('../../data/models.js', () => {
	const saveMock = jest.fn();

	// Constructeur factice utilisé par `new Server(...)`
	const ServerMock = jest.fn(function Server(doc) {
		Object.assign(this, doc);
		this.save = saveMock;
	});

	// Méthode statique utilisée par setup.js
	ServerMock.findOne = jest.fn();
	// Expose le mock de save pour les assertions
	ServerMock._saveMock = saveMock;

	return { Server: ServerMock };
});

describe('Slash command /setup', () => {
	let setupCommand;
	let ServerModel;

	beforeEach(() => {
		jest.resetModules();
		jest.clearAllMocks();

		// Re-require après resetModules
		setupCommand = require('../../interactions/slash/server/setup.js');
		({ Server: ServerModel } = require('../../data/models.js'));
	});

	function createInteraction(overrides = {}) {
		const client = {
			traductions: new Map(),
		};

		const guild = {
			id: 'test-guild-id',
			name: 'Test Guild',
		};

		const options = {
			getString: jest.fn((name) => {
				if (name === 'lang') return 'en';
				if (name === 'camp') return 'warden';
				return null;
			}),
		};

		return {
			client,
			guild,
			options,
			reply: jest.fn().mockResolvedValue(undefined),
			...overrides,
		};
	}

	it('doit définir correctement les métadonnées de la commande', () => {
		expect(setupCommand.data.name).toBe('setup');
		const options = setupCommand.data.options ?? [];
		// lang + camp
		expect(options).toHaveLength(2);
		expect(options.some((opt) => opt.name === 'lang')).toBe(true);
		expect(options.some((opt) => opt.name === 'camp')).toBe(true);
	});

	it('répond SERVER_IS_ALREADY_INIT si le serveur existe déjà', async () => {
		const interaction = createInteraction();

		ServerModel.findOne.mockResolvedValue({ guild_id: interaction.guild.id });

		await setupCommand.execute(interaction);

		expect(ServerModel.findOne).toHaveBeenCalledWith({ guild_id: interaction.guild.id });
		expect(interaction.reply).toHaveBeenCalledWith({
			content: 'SERVER_IS_ALREADY_INIT',
			flags: 64,
		});
	});

	it('crée un nouveau serveur, met à jour les traductions et renvoie un embed quand le serveur n’existe pas', async () => {
		// Pas de serveur existant
		ServerModel.findOne.mockResolvedValue(null);

		const interaction = createInteraction();

		await setupCommand.execute(interaction);

		// Vérifie la recherche initiale
		expect(ServerModel.findOne).toHaveBeenCalledWith({ guild_id: interaction.guild.id });
		// Vérifie que `new Server(...)` a été utilisé et que save a été appelé
		expect(ServerModel).toHaveBeenCalledTimes(1);
		expect(ServerModel._saveMock).toHaveBeenCalledTimes(1);

		// La langue doit être stockée dans la map des traductions du client
		expect(interaction.client.traductions.get(interaction.guild.id)).toBe('en');

		// Vérifie la réponse envoyée
		expect(interaction.reply).toHaveBeenCalledTimes(1);
		const replyArg = interaction.reply.mock.calls[0][0];
		expect(replyArg.content).toBe('SERVER_IS_INIT');
		expect(replyArg.flags).toBe(64);
		expect(replyArg.embeds).toHaveLength(1);

		const embed = replyArg.embeds[0];
		const embedData = embed.data ?? embed;
		expect(embedData.title).toBe('SERVER_TITLE_CONFIGURATION');

		const fields = embedData.fields ?? [];
		expect(fields.some((f) => f.name === 'SERVER_FIELD_GUILD_NAME' && f.value === interaction.guild.name)).toBe(true);
		expect(fields.some((f) => f.name === 'SERVER_FIELD_GUILD_ID' && f.value === interaction.guild.id)).toBe(true);
		expect(fields.some((f) => f.name === 'SERVER_FIELD_GUILD_LANG' && f.value === 'en')).toBe(true);
		expect(fields.some((f) => f.name === 'SERVER_FIELD_GUILD_CAMP' && f.value === 'warden')).toBe(true);
	});
});

