const mockTranslate = jest.fn((key) => key);

jest.mock('../../utils/translations.js', () => jest.fn().mockImplementation(() => ({ translate: mockTranslate })));

jest.mock('../../utils/colors.js', () => ({ getRandomColor: jest.fn().mockReturnValue(0xabcdef) }));

const mockBuildStockpileListEmbed = jest.fn();
const mockBuildStockpileListComponents = jest.fn().mockResolvedValue([]);
jest.mock('../../interactions/embeds/stockpileList.js', () => ({
	buildStockpileListEmbed: mockBuildStockpileListEmbed,
	buildStockpileListComponents: mockBuildStockpileListComponents,
}));

const mockFindTrackedMessage = jest.fn();
const mockSaveTrackedMessage = jest.fn().mockResolvedValue(undefined);
jest.mock('../../utils/trackedMessage.js', () => {
	const find = (...args) => mockFindTrackedMessage(...args);
	return {
		findTrackedMessage: find,
		saveTrackedMessage: (...args) => mockSaveTrackedMessage(...args),
		editTrackedOrFallback: async (opts) => {
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
		},
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
	},
	TrackedMessage: {
		findOne: jest.fn().mockResolvedValue(null),
		findOneAndUpdate: jest.fn().mockResolvedValue(undefined),
		deleteOne: jest.fn().mockResolvedValue(undefined),
		deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
	},
}));

describe('Slash command /stockpile - add|list', () => {
	let stockpileCommand;

	beforeEach(() => {
		jest.clearAllMocks();
		mockFindTrackedMessage.mockResolvedValue(null);
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

	it('définit uniquement les sous-commandes add et list', () => {
		const names = (stockpileCommand.data.options ?? []).map((o) => o.name);
		expect(names).toEqual(['add', 'list']);
		expect(stockpileCommand.data.name_localizations?.fr).toBe('depot');
	});

	it('répond NO_DM quand guild null (DM)', async () => {
		const interaction = createInteraction('add', { guild: null });
		await stockpileCommand.execute(interaction);
		expect(interaction.reply).toHaveBeenCalledWith(
			expect.objectContaining({ content: 'NO_DM', flags: 64 }),
		);
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
		it('répond LIST_EMPTY et buildStockpileListEmbed est appelé avec guild.id', async () => {
			mockBuildStockpileListEmbed.mockResolvedValue({ embed: null, isEmpty: true });
			const interaction = createInteraction('list');
			await stockpileCommand.execute(interaction);
			expect(interaction.deferReply).toHaveBeenCalledWith();
			expect(mockBuildStockpileListEmbed).toHaveBeenCalledWith(
				expect.anything(),
				'guild-123',
				expect.anything(),
			);
			expect(interaction.editReply).toHaveBeenCalledWith(
				expect.objectContaining({ content: 'STOCKPILE_LIST_EMPTY' }),
			);
		});

		it('affiche l’embed quand la liste n’est pas vide', async () => {
			const fakeEmbed = { toJSON: () => ({ title: 'List' }) };
			mockBuildStockpileListEmbed.mockResolvedValue({ embed: fakeEmbed, isEmpty: false });
			mockFindTrackedMessage.mockResolvedValue(null);
			const interaction = createInteraction('list');
			await stockpileCommand.execute(interaction);
			expect(interaction.deferReply).toHaveBeenCalledWith();
			expect(interaction.editReply).toHaveBeenCalledWith(expect.objectContaining({ embeds: [fakeEmbed] }));
			expect(mockBuildStockpileListComponents).toHaveBeenCalledWith(
				expect.anything(),
				'guild-123',
				expect.anything(),
			);
			expect(mockSaveTrackedMessage).toHaveBeenCalled();
		});

		it('édite le message existant pour list au lieu de reply quand trouvé', async () => {
			const fakeEmbed = { toJSON: () => ({ title: 'List' }) };
			mockBuildStockpileListEmbed.mockResolvedValue({ embed: fakeEmbed, isEmpty: false });
			const editMock = jest.fn().mockResolvedValue(undefined);
			mockFindTrackedMessage.mockResolvedValue({ edit: editMock });
			const interaction = createInteraction('list');
			await stockpileCommand.execute(interaction);
			expect(editMock).toHaveBeenCalledWith(expect.objectContaining({ embeds: [fakeEmbed] }));
			expect(interaction.editReply).not.toHaveBeenCalled();
			expect(interaction.deleteReply).toHaveBeenCalled();
		});
	});

	it('répond COMMAND_UNKNOWN pour une sous-commande inconnue', async () => {
		const interaction = createInteraction('unknown_subcommand');
		await stockpileCommand.execute(interaction);
		expect(interaction.reply).toHaveBeenCalledWith(
			expect.objectContaining({ content: 'COMMAND_UNKNOWN', flags: 64 }),
		);
	});
});
