const { getV2Text, MessageFlags } = require('../helpers/v2Payload.js');
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

const { v2Text } = require('../../utils/componentsV2.js');

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
			getBoolean: jest.fn((name) => {
				if (name === 'logs') return overrides.logs ?? null;
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
		// lang + camp + logs
		expect(options).toHaveLength(3);
		expect(options.some((opt) => opt.name === 'lang')).toBe(true);
		expect(options.some((opt) => opt.name === 'camp')).toBe(true);
		expect(options.some((opt) => opt.name === 'logs')).toBe(true);
	});

	it('répond SERVER_IS_ALREADY_INIT si le serveur existe déjà', async () => {
		const interaction = createInteraction();

		ServerModel.findOne.mockResolvedValue({ guild_id: interaction.guild.id });

		await setupCommand.execute(interaction);

		expect(ServerModel.findOne).toHaveBeenCalledWith({ guild_id: interaction.guild.id });
		expect(interaction.reply).toHaveBeenCalledWith(v2Text('SERVER_IS_ALREADY_INIT', { ephemeral: true }));
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
		expect(ServerModel).toHaveBeenCalledWith(expect.objectContaining({
			guild_id: interaction.guild.id,
			lang: 'en',
			camp: 'warden',
			logs: false,
		}));
		expect(ServerModel._saveMock).toHaveBeenCalledTimes(1);

		// La langue doit être stockée dans la map des traductions du client
		expect(interaction.client.traductions.get(interaction.guild.id)).toBe('en');

		// Vérifie la réponse envoyée
		expect(interaction.reply).toHaveBeenCalledTimes(1);
		const replyArg = interaction.reply.mock.calls[0][0];
		expect(Number(replyArg.flags) & MessageFlags.IsComponentsV2).toBeTruthy();
		expect(Number(replyArg.flags) & MessageFlags.Ephemeral).toBeTruthy();
		const body = getV2Text(replyArg);
		expect(body).toContain('SERVER_IS_INIT');
		expect(body).toContain('SERVER_TITLE_CONFIGURATION');
		expect(body).toContain(interaction.guild.name);
		expect(body).toContain(interaction.guild.id);
		expect(body).toContain('en');
		expect(body).toContain('warden');
		expect(body).toContain('SERVER_LOGS_DISABLED');
	});

	it('enregistre logs:true quand l’option est passée', async () => {
		ServerModel.findOne.mockResolvedValue(null);
		const interaction = createInteraction({ logs: true });

		await setupCommand.execute(interaction);

		expect(ServerModel).toHaveBeenCalledWith(expect.objectContaining({ logs: true }));
		expect(getV2Text(interaction.reply.mock.calls[0][0])).toContain('SERVER_LOGS_ENABLED');
	});
});

