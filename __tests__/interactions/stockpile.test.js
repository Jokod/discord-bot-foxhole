const mockTranslate = jest.fn((key) => key);

jest.mock('../../utils/translations.js', () => jest.fn().mockImplementation(() => ({ translate: mockTranslate })));

jest.mock('../../utils/colors.js', () => ({ getRandomColor: jest.fn().mockReturnValue(0xabcdef) }));

const mockBuildStockpileListPayload = jest.fn();
const mockBuildStockpileManagePayload = jest.fn().mockResolvedValue({
	flags: 64,
	components: [],
});
jest.mock('../../interactions/embeds/stockpileList.js', () => ({
	buildStockpileListPayload: (...args) => mockBuildStockpileListPayload(...args),
	buildStockpileManagePayload: (...args) => mockBuildStockpileManagePayload(...args),
}));

const mockCanAccessStockpileManage = jest.fn();
jest.mock('../../utils/stockpile-permissions.js', () => ({
	canAccessStockpileManage: (...args) => mockCanAccessStockpileManage(...args),
}));

const mockFindTrackedMessage = jest.fn();
const mockSaveTrackedMessage = jest.fn().mockResolvedValue(undefined);
const mockEditTrackedCalls = [];
jest.mock('../../utils/trackedMessage.js', () => {
	const find = (...args) => mockFindTrackedMessage(...args);
	const editTrackedOrFallback = async (opts) => {
		mockEditTrackedCalls.push(opts);
		const message = await find(opts.channel, opts.serverId, opts.messageType, { model: opts.model, fallbackMatcher: opts.fallbackMatcher });
		if (message) {
			try {
				await message.edit(opts.editPayload);
				return { usedFallback: false };
			}
			catch {
				// edit failed, fallback will send
			}
		}
		const sent = await opts.fallbackSend();
		if (sent?.id) {
			await mockSaveTrackedMessage(opts.serverId, opts.channel?.id, sent.id, opts.messageType, opts.model);
		}
		return { usedFallback: true };
	};
	return {
		findTrackedMessage: find,
		saveTrackedMessage: (...args) => mockSaveTrackedMessage(...args),
		editTrackedOrFallback,
	};
});

jest.mock('../../data/models.js', () => ({
	Stockpile: {
		findOne: jest.fn(),
		deleteMany: jest.fn(),
		find: jest.fn().mockReturnValue({
			sort: jest.fn().mockResolvedValue([]),
		}),
		countDocuments: jest.fn(),
		create: jest.fn(),
		exists: jest.fn(),
	},
	TrackedMessage: {
		findOne: jest.fn().mockResolvedValue(null),
		findOneAndUpdate: jest.fn().mockResolvedValue(undefined),
		deleteOne: jest.fn().mockResolvedValue(undefined),
		deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
	},
}));

const { v2Text } = require('../../utils/componentsV2.js');
const { MessageFlags } = require('discord.js');

describe('Slash command /stockpile - add|list|manage', () => {
	let stockpileCommand;

	beforeEach(() => {
		jest.clearAllMocks();
		mockEditTrackedCalls.length = 0;
		mockFindTrackedMessage.mockResolvedValue(null);
		mockCanAccessStockpileManage.mockResolvedValue(true);
		mockBuildStockpileListPayload.mockResolvedValue(v2Text('STOCKPILE_LIST_EMPTY'));
		stockpileCommand = require('../../interactions/slash/stockpile/stockpile.js');
	});

	function createInteraction(subcommand, overrides = {}) {
		const guild = { id: 'guild-123' };
		const getSubcommand = jest.fn(() => subcommand);
		return {
			client: { user: { id: 'bot-123' }, traductions: new Map() },
			guild,
			channelId: 'channel-456',
			channel: null,
			user: { id: 'user-789' },
			member: { permissions: { has: jest.fn().mockReturnValue(false) } },
			options: { getSubcommand, getString: jest.fn() },
			reply: jest.fn().mockResolvedValue(undefined),
			deferReply: jest.fn().mockResolvedValue(undefined),
			editReply: jest.fn().mockResolvedValue({ id: 'msg-new' }),
			deleteReply: jest.fn().mockResolvedValue(undefined),
			followUp: jest.fn().mockResolvedValue(undefined),
			showModal: jest.fn().mockResolvedValue(undefined),
			...overrides,
		};
	}

	it('définit les sous-commandes add, list et manage', () => {
		const names = (stockpileCommand.data.options ?? []).map((o) => o.name);
		expect(names).toEqual(['add', 'list', 'manage']);
		expect(stockpileCommand.data.name_localizations?.fr).toBe('depot');
	});

	it('répond NO_DM quand guild null (DM)', async () => {
		const interaction = createInteraction('add', { guild: null });
		await stockpileCommand.execute(interaction);
		expect(interaction.reply).toHaveBeenCalledWith(v2Text('NO_DM', { ephemeral: true }));
	});

	describe('add', () => {
		it('affiche le modal d\'ajout', async () => {
			const interaction = createInteraction('add');
			await stockpileCommand.execute(interaction);
			expect(interaction.showModal).toHaveBeenCalledTimes(1);
			const modal = interaction.showModal.mock.calls[0][0];
			expect(modal.data?.custom_id ?? modal.customId).toBe('modal_stockpile_add');
		});
	});

	describe('list - isolation serveur', () => {
		it('répond LIST_EMPTY et buildStockpileListPayload est appelé avec guild.id', async () => {
			mockBuildStockpileListPayload.mockResolvedValue(v2Text('STOCKPILE_LIST_EMPTY'));
			const interaction = createInteraction('list');
			await stockpileCommand.execute(interaction);
			expect(interaction.deferReply).toHaveBeenCalledWith();
			expect(mockBuildStockpileListPayload).toHaveBeenCalledWith(
				expect.anything(),
				'guild-123',
				expect.anything(),
			);
			expect(interaction.editReply).toHaveBeenCalledWith(v2Text('STOCKPILE_LIST_EMPTY'));
		});

		it('affiche le payload V2 quand la liste n’est pas vide', async () => {
			const payload = {
				flags: MessageFlags.IsComponentsV2,
				components: [{ toJSON: () => ({ type: 10, content: 'List' }) }],
			};
			mockBuildStockpileListPayload.mockResolvedValue(payload);
			mockFindTrackedMessage.mockResolvedValue(null);
			const interaction = createInteraction('list');
			await stockpileCommand.execute(interaction);
			expect(interaction.deferReply).toHaveBeenCalledWith();
			expect(interaction.editReply).toHaveBeenCalledWith(payload);
			expect(mockSaveTrackedMessage).toHaveBeenCalled();
		});

		it('édite le message existant pour list au lieu de reply quand trouvé', async () => {
			const payload = {
				flags: MessageFlags.IsComponentsV2,
				components: [{ toJSON: () => ({ type: 10, content: 'List' }) }],
			};
			mockBuildStockpileListPayload.mockResolvedValue(payload);
			const editMock = jest.fn().mockResolvedValue(undefined);
			mockFindTrackedMessage.mockResolvedValue({ edit: editMock });
			const interaction = createInteraction('list');
			await stockpileCommand.execute(interaction);
			expect(editMock).toHaveBeenCalledWith(payload);
			expect(interaction.editReply).not.toHaveBeenCalled();
			expect(interaction.deleteReply).toHaveBeenCalled();
		});

		it('utilise fallbackMatcher pour retrouver le message liste', async () => {
			const payload = {
				flags: MessageFlags.IsComponentsV2,
				components: [],
			};
			mockBuildStockpileListPayload.mockResolvedValue(payload);
			const interaction = createInteraction('list');
			await stockpileCommand.execute(interaction);
			const opts = mockEditTrackedCalls[0];
			const matched = opts.fallbackMatcher([{
				author: { id: 'bot-123' },
				embeds: [{ title: '🔑 STOCKPILE_LIST_CODES' }],
			}]);
			expect(matched).toBeTruthy();
			expect(opts.fallbackMatcher([])).toBeNull();

			const v2Matched = opts.fallbackMatcher([{
				author: { id: 'bot-123' },
				embeds: [],
				flags: { has: (f) => f === MessageFlags.IsComponentsV2 },
				components: [{ type: 10, content: '🔑 STOCKPILE_LIST_CODES\nbody' }],
			}]);
			expect(v2Matched).toBeTruthy();

			expect(opts.fallbackMatcher([{
				author: { id: 'bot-123' },
				embeds: [],
				flags: { has: (f) => f === MessageFlags.IsComponentsV2 },
				components: [{ type: 10, content: 'other' }],
			}])).toBeNull();

			expect(opts.fallbackMatcher([{
				author: { id: 'bot-123' },
				embeds: [{ title: 'wrong title' }],
				flags: { has: () => false },
			}])).toBeNull();

			expect(opts.fallbackMatcher([{
				embeds: [],
				flags: { has: () => false },
			}])).toBeNull();

			expect(opts.fallbackMatcher([{
				author: { id: 'bot-123' },
				embeds: [],
				flags: { has: (f) => f === MessageFlags.IsComponentsV2 },
			}])).toBeNull();
		});

		it('deleteReply ignore les erreurs quand message existant édité', async () => {
			const payload = { flags: MessageFlags.IsComponentsV2, components: [] };
			mockBuildStockpileListPayload.mockResolvedValue(payload);
			const editMock = jest.fn().mockResolvedValue(undefined);
			mockFindTrackedMessage.mockResolvedValue({ edit: editMock });
			const interaction = createInteraction('list');
			interaction.deleteReply.mockRejectedValueOnce(new Error('delete failed'));
			await expect(stockpileCommand.execute(interaction)).resolves.toBeUndefined();
			expect(editMock).toHaveBeenCalled();
		});

		it('list vide via editTrackedOrFallback fallbackSend', async () => {
			mockBuildStockpileListPayload.mockResolvedValue(v2Text('STOCKPILE_LIST_EMPTY'));
			const interaction = createInteraction('list');
			await stockpileCommand.execute(interaction);
			const opts = mockEditTrackedCalls[0];
			await opts.fallbackSend();
			expect(interaction.editReply).toHaveBeenCalledWith(v2Text('STOCKPILE_LIST_EMPTY'));
		});

		it('list non vide exécute fallbackSend', async () => {
			const payload = {
				flags: MessageFlags.IsComponentsV2,
				components: [{ toJSON: () => ({ type: 10, content: 'List' }) }],
			};
			mockBuildStockpileListPayload.mockResolvedValue(payload);
			const interaction = createInteraction('list');
			await stockpileCommand.execute(interaction);
			const opts = mockEditTrackedCalls[0];
			await opts.fallbackSend();
			expect(interaction.editReply).toHaveBeenCalledWith(payload);
		});
	});

	describe('manage', () => {
		it('refuse l’accès sans droit', async () => {
			mockCanAccessStockpileManage.mockResolvedValue(false);
			const interaction = createInteraction('manage');
			await stockpileCommand.execute(interaction);
			expect(interaction.reply).toHaveBeenCalledWith(
				v2Text('STOCKPILE_MANAGE_NO_ACCESS', { ephemeral: true }),
			);
			expect(interaction.deferReply).not.toHaveBeenCalled();
		});

		it('répond en éphémère avec le panneau manage', async () => {
			const payload = {
				flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
				components: [],
			};
			mockBuildStockpileManagePayload.mockResolvedValue(payload);
			const interaction = createInteraction('manage');
			await stockpileCommand.execute(interaction);
			expect(interaction.deferReply).toHaveBeenCalledWith({ flags: 64 });
			expect(mockBuildStockpileManagePayload).toHaveBeenCalledWith(
				expect.anything(),
				'guild-123',
				expect.anything(),
			);
			expect(interaction.editReply).toHaveBeenCalledWith(payload);
		});
	});

	it('répond COMMAND_UNKNOWN pour une sous-commande inconnue', async () => {
		const interaction = createInteraction('unknown_subcommand');
		await stockpileCommand.execute(interaction);
		expect(interaction.reply).toHaveBeenCalledWith(
			v2Text('COMMAND_UNKNOWN', { ephemeral: true }),
		);
	});
});
