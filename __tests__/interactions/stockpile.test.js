const mockTranslate = jest.fn((key) => key);

const { PermissionFlagsBits, Collection } = require('discord.js');

jest.mock('../../utils/translations.js', () => jest.fn().mockImplementation(() => ({ translate: mockTranslate })));

jest.mock('../../utils/colors.js', () => ({ getRandomColor: jest.fn().mockReturnValue(0xabcdef) }));

const mockBuildStockpileListEmbed = jest.fn();
const mockBuildStockpileListComponents = jest.fn().mockResolvedValue([]);
jest.mock('../../interactions/embeds/stockpileList.js', () => ({
	buildStockpileListEmbed: mockBuildStockpileListEmbed,
	buildStockpileListComponents: mockBuildStockpileListComponents,
}));

jest.mock('../../utils/notifications.js', () => ({ sendToSubscribers: jest.fn().mockResolvedValue(undefined) }));

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

const { Stockpile, TrackedMessage } = require('../../data/models.js');

// Stockpile documents need a save method when findOne returns one
const createDoc = (overrides = {}) => ({
	save: jest.fn().mockResolvedValue(undefined),
	server_id: 'guild-123',
	id: '1',
	owner_id: 'owner-456',
	deleted: false,
	...overrides,
});

describe('Slash command /stockpile - sécurité et comportement', () => {
	let stockpileCommand;

	beforeEach(() => {
		jest.clearAllMocks();
		mockFindTrackedMessage.mockResolvedValue(null);
		stockpileCommand = require('../../interactions/slash/stockpile/stockpile.js');
	});

	function createInteraction(subcommand, options = {}, overrides = {}) {
		const guild = { id: 'guild-123' };
		const channelId = 'channel-456';
		const userId = 'user-789';
		const getString = jest.fn((name) => (options[name] !== undefined ? options[name] : null));
		const getSubcommand = jest.fn(() => subcommand);
		const slashCommands = new Collection();
		slashCommands.set('stockpile', {
			data: {
				name: 'stockpile',
				options: [
					{ name: 'help' }, { name: 'add' }, { name: 'remove' }, { name: 'restore' },
					{ name: 'list' }, { name: 'reset' }, { name: 'cleanup' }, { name: 'deleteall' },
				],
			},
		});
		return {
			client: { user: { id: 'bot-123' }, traductions: new Map(), slashCommands },
			guild,
			channelId,
			channel: null,
			user: { id: userId },
			options: { getSubcommand, getString },
			reply: jest.fn().mockResolvedValue(undefined),
			deferReply: jest.fn().mockResolvedValue(undefined),
			editReply: jest.fn().mockResolvedValue({ id: 'msg-new' }),
			deleteReply: jest.fn().mockResolvedValue(undefined),
			followUp: jest.fn().mockResolvedValue(undefined),
			fetchReply: jest.fn().mockResolvedValue({ id: 'msg-new' }),
			showModal: jest.fn().mockResolvedValue(undefined),
			member: {
				permissions: {
					has: jest.fn((perm) => perm === PermissionFlagsBits.ManageGuild),
				},
			},
			...overrides,
		};
	}

	it('répond NO_DM quand guild null (DM)', async () => {
		const interaction = createInteraction('help', {}, { guild: null });
		await stockpileCommand.execute(interaction);
		expect(interaction.reply).toHaveBeenCalledWith(
			expect.objectContaining({ content: 'NO_DM', flags: 64 }),
		);
	});

	describe('help', () => {
		it('affiche la liste des sous-commandes stockpile', async () => {
			const interaction = createInteraction('help');
			await stockpileCommand.execute(interaction);
			expect(interaction.reply).toHaveBeenCalledWith(
				expect.objectContaining({
					embeds: expect.arrayContaining([expect.anything()]),
					flags: 64,
				}),
			);
			expect(mockTranslate).toHaveBeenCalledWith('STOCKPILE_LIST_COMMANDS');
		});
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

	describe('remove - isolation serveur et propriétaire', () => {
		it('rejette un id non numérique', async () => {
			const interaction = createInteraction('remove', { id: 'abc' });
			await stockpileCommand.execute(interaction);
			expect(Stockpile.findOne).not.toHaveBeenCalled();
			expect(interaction.reply).toHaveBeenCalledWith(
				expect.objectContaining({ content: 'STOCKPILE_INVALID_ID', flags: 64 }),
			);
		});

		it('répond NOT_EXIST si le stock n’existe pas sur ce serveur', async () => {
			Stockpile.findOne.mockResolvedValue(null);
			const interaction = createInteraction('remove', { id: '1' });
			await stockpileCommand.execute(interaction);
			expect(Stockpile.findOne).toHaveBeenCalledWith({ server_id: 'guild-123', id: '1' });
			expect(interaction.reply).toHaveBeenCalledWith(
				expect.objectContaining({ content: 'STOCKPILE_NOT_EXIST', flags: 64 }),
			);
		});

		it('refuse si l’utilisateur n’est pas le créateur', async () => {
			const doc = createDoc({ server_id: 'guild-123', id: '1', owner_id: 'other-user' });
			Stockpile.findOne.mockResolvedValue(doc);
			const interaction = createInteraction('remove', { id: '1' });
			await stockpileCommand.execute(interaction);
			expect(doc.save).not.toHaveBeenCalled();
			expect(interaction.reply).toHaveBeenCalledWith(
				expect.objectContaining({ content: 'STOCKPILE_ARE_NO_OWNER_ERROR', flags: 64 }),
			);
		});

		it('marque comme supprimé et réaffiche la liste si l’utilisateur est le créateur', async () => {
			const doc = createDoc({ server_id: 'guild-123', id: '1', owner_id: 'user-789', deleted: false });
			Stockpile.findOne.mockResolvedValue(doc);
			mockBuildStockpileListEmbed.mockResolvedValue({ embed: { data: {} }, isEmpty: false });
			mockFindTrackedMessage.mockResolvedValue(null);
			const interaction = createInteraction('remove', { id: '1' });
			await stockpileCommand.execute(interaction);
			expect(doc.deleted).toBe(true);
			expect(doc.save).toHaveBeenCalled();
			expect(mockBuildStockpileListEmbed).toHaveBeenCalledWith(
				expect.anything(),
				'guild-123',
				expect.anything(),
			);
			expect(interaction.followUp).toHaveBeenCalledWith(expect.objectContaining({ embeds: [expect.anything()] }));
		});

		it('édite le message existant au lieu de followUp quand la liste est trouvée', async () => {
			const doc = createDoc({ server_id: 'guild-123', id: '1', owner_id: 'user-789', deleted: false });
			Stockpile.findOne.mockResolvedValue(doc);
			mockBuildStockpileListEmbed.mockResolvedValue({ embed: { data: {} }, isEmpty: false });
			Stockpile.find.mockReturnValue({
				sort: jest.fn().mockResolvedValue([{ id: '1', server_id: 'guild-123' }]),
			});
			const editMock = jest.fn().mockResolvedValue(undefined);
			mockFindTrackedMessage.mockResolvedValue({ edit: editMock });
			const interaction = createInteraction('remove', { id: '1' });
			await stockpileCommand.execute(interaction);
			expect(editMock).toHaveBeenCalledWith(expect.objectContaining({ embeds: [expect.anything()] }));
			expect(interaction.followUp).not.toHaveBeenCalled();
		});

		it('répond STOCKPILE_ALREADY_DELETED si le stock est déjà marqué supprimé', async () => {
			const doc = createDoc({ server_id: 'guild-123', id: '1', owner_id: 'user-789', deleted: true });
			Stockpile.findOne.mockResolvedValue(doc);
			const interaction = createInteraction('remove', { id: '1' });
			await stockpileCommand.execute(interaction);
			expect(doc.save).not.toHaveBeenCalled();
			expect(interaction.reply).toHaveBeenCalledWith(
				expect.objectContaining({ content: 'STOCKPILE_ALREADY_DELETED', flags: 64 }),
			);
		});

		it('permet à tout le monde de supprimer un stock legacy (owner_id 0)', async () => {
			const doc = createDoc({ server_id: 'guild-123', id: '1', owner_id: '0', deleted: false });
			Stockpile.findOne.mockResolvedValue(doc);
			mockBuildStockpileListEmbed.mockResolvedValue({ embed: { data: {} }, isEmpty: false });
			mockFindTrackedMessage.mockResolvedValue(null);
			const interaction = createInteraction('remove', { id: '1' });
			await stockpileCommand.execute(interaction);
			expect(doc.deleted).toBe(true);
			expect(doc.save).toHaveBeenCalled();
		});

		it('utilise editTrackedOrFallback avec STOCKPILE_LIST_EMPTY quand la liste est vide après remove', async () => {
			const doc = createDoc({ server_id: 'guild-123', id: '1', owner_id: 'user-789', deleted: false });
			Stockpile.findOne.mockResolvedValue(doc);
			mockBuildStockpileListEmbed.mockResolvedValue({ embed: null, isEmpty: true });
			const editMock = jest.fn().mockResolvedValue(undefined);
			mockFindTrackedMessage.mockResolvedValue({ edit: editMock });
			const interaction = createInteraction('remove', { id: '1' });
			await stockpileCommand.execute(interaction);
			expect(editMock).toHaveBeenCalledWith(
				expect.objectContaining({
					content: 'STOCKPILE_LIST_EMPTY',
					embeds: [],
					components: [],
				}),
			);
		});
	});

	describe('restore - isolation serveur et propriétaire', () => {
		it('rejette un id non numérique', async () => {
			const interaction = createInteraction('restore', { id: 'x' });
			await stockpileCommand.execute(interaction);
			expect(Stockpile.findOne).not.toHaveBeenCalled();
			expect(interaction.reply).toHaveBeenCalledWith(
				expect.objectContaining({ content: 'STOCKPILE_INVALID_ID', flags: 64 }),
			);
		});

		it('répond NOT_EXIST si le stock n’existe pas', async () => {
			Stockpile.findOne.mockResolvedValue(null);
			const interaction = createInteraction('restore', { id: '1' });
			await stockpileCommand.execute(interaction);
			expect(Stockpile.findOne).toHaveBeenCalledWith({ server_id: 'guild-123', id: '1' });
			expect(interaction.reply).toHaveBeenCalledWith(
				expect.objectContaining({ content: 'STOCKPILE_NOT_EXIST', flags: 64 }),
			);
		});

		it('refuse si le stock n’est pas marqué supprimé', async () => {
			const doc = createDoc({ server_id: 'guild-123', id: '1', owner_id: 'user-789', deleted: false });
			Stockpile.findOne.mockResolvedValue(doc);
			const interaction = createInteraction('restore', { id: '1' });
			await stockpileCommand.execute(interaction);
			expect(doc.save).not.toHaveBeenCalled();
			expect(interaction.reply).toHaveBeenCalledWith(
				expect.objectContaining({ content: 'STOCKPILE_NOT_DELETED', flags: 64 }),
			);
		});

		it('refuse si l’utilisateur n’est pas le créateur', async () => {
			const doc = createDoc({ server_id: 'guild-123', id: '1', owner_id: 'other-user', deleted: true });
			Stockpile.findOne.mockResolvedValue(doc);
			const interaction = createInteraction('restore', { id: '1' });
			await stockpileCommand.execute(interaction);
			expect(doc.save).not.toHaveBeenCalled();
			expect(interaction.reply).toHaveBeenCalledWith(
				expect.objectContaining({ content: 'STOCKPILE_ARE_NO_OWNER_ERROR', flags: 64 }),
			);
		});

		it('réactive et réaffiche la liste si le créateur réactive', async () => {
			const doc = createDoc({ server_id: 'guild-123', id: '1', owner_id: 'user-789', deleted: true });
			Stockpile.findOne.mockResolvedValue(doc);
			mockBuildStockpileListEmbed.mockResolvedValue({ embed: {}, isEmpty: false });
			const interaction = createInteraction('restore', { id: '1' });
			await stockpileCommand.execute(interaction);
			expect(doc.deleted).toBe(false);
			expect(doc.deletedAt).toBeNull();
			expect(doc.save).toHaveBeenCalled();
			expect(mockBuildStockpileListEmbed).toHaveBeenCalledWith(
				expect.anything(),
				'guild-123',
				expect.anything(),
			);
		});

		it('renvoie une erreur si la limite de stocks actifs est atteinte', async () => {
			const doc = createDoc({ server_id: 'guild-123', id: '1', owner_id: 'user-789', deleted: true });
			Stockpile.findOne.mockResolvedValue(doc);
			Stockpile.countDocuments.mockResolvedValue(25);

			const interaction = createInteraction('restore', { id: '1' });
			await stockpileCommand.execute(interaction);

			expect(Stockpile.countDocuments).toHaveBeenCalledWith({ server_id: 'guild-123', deleted: false });
			expect(doc.save).not.toHaveBeenCalled();
			expect(interaction.reply).toHaveBeenCalledWith(
				expect.objectContaining({ content: 'STOCKPILE_MAX_REACHED', flags: 64 }),
			);
		});

		it('permet à tout le monde de réactiver un stock legacy (owner_id 0)', async () => {
			const doc = createDoc({ server_id: 'guild-123', id: '1', owner_id: '0', deleted: true });
			Stockpile.findOne.mockResolvedValue(doc);
			Stockpile.countDocuments.mockResolvedValue(1);
			mockBuildStockpileListEmbed.mockResolvedValue({ embed: null, isEmpty: true });
			const editMock = jest.fn().mockResolvedValue(undefined);
			mockFindTrackedMessage.mockResolvedValue({ edit: editMock });
			const interaction = createInteraction('restore', { id: '1' });
			await stockpileCommand.execute(interaction);
			expect(doc.deleted).toBe(false);
			expect(doc.save).toHaveBeenCalled();
			expect(editMock).toHaveBeenCalledWith(
				expect.objectContaining({ content: 'STOCKPILE_LIST_EMPTY', embeds: [], components: [] }),
			);
		});
	});

	describe('reset - isolation serveur', () => {
		it('rejette un id non numérique', async () => {
			const interaction = createInteraction('reset', { id: 'abc' });
			await stockpileCommand.execute(interaction);
			expect(Stockpile.findOne).not.toHaveBeenCalled();
			expect(interaction.reply).toHaveBeenCalledWith(
				expect.objectContaining({ content: 'STOCKPILE_INVALID_ID', flags: 64 }),
			);
		});

		it('répond NOT_EXIST si le stock n’existe pas sur ce serveur', async () => {
			Stockpile.findOne.mockResolvedValue(null);
			const interaction = createInteraction('reset', { id: '1' });
			await stockpileCommand.execute(interaction);
			expect(Stockpile.findOne).toHaveBeenCalledWith({ server_id: 'guild-123', id: '1' });
			expect(interaction.reply).toHaveBeenCalledWith(
				expect.objectContaining({ content: 'STOCKPILE_NOT_EXIST', flags: 64 }),
			);
		});

		it('met à jour uniquement le stock du serveur courant', async () => {
			const doc = createDoc({ server_id: 'guild-123', id: '1' });
			Stockpile.findOne.mockResolvedValue(doc);
			const interaction = createInteraction('reset', { id: '1' });
			await stockpileCommand.execute(interaction);
			expect(Stockpile.findOne).toHaveBeenCalledWith({ server_id: 'guild-123', id: '1' });
			expect(doc.save).toHaveBeenCalled();
			expect(interaction.reply).toHaveBeenCalledWith(
				expect.objectContaining({ content: 'STOCKPILE_RESET_SUCCESS', flags: 64 }),
			);
		});

		it('refuse le reset si le stock est marqué supprimé', async () => {
			const doc = createDoc({ server_id: 'guild-123', id: '1', deleted: true });
			Stockpile.findOne.mockResolvedValue(doc);
			const interaction = createInteraction('reset', { id: '1' });
			await stockpileCommand.execute(interaction);
			expect(doc.save).not.toHaveBeenCalled();
			expect(interaction.reply).toHaveBeenCalledWith(
				expect.objectContaining({ content: 'STOCKPILE_ALREADY_DELETED', flags: 64 }),
			);
		});

		it('met à jour la liste tracked avec STOCKPILE_LIST_EMPTY quand isEmpty après reset', async () => {
			const doc = createDoc({ server_id: 'guild-123', id: '1', deleted: false });
			Stockpile.findOne.mockResolvedValue(doc);
			mockBuildStockpileListEmbed.mockResolvedValue({ embed: null, isEmpty: true });
			const editMock = jest.fn().mockResolvedValue(undefined);
			mockFindTrackedMessage.mockResolvedValue({ edit: editMock });
			const interaction = createInteraction('reset', { id: '1' });
			await stockpileCommand.execute(interaction);
			expect(doc.save).toHaveBeenCalled();
			expect(editMock).toHaveBeenCalledWith(
				expect.objectContaining({
					content: 'STOCKPILE_LIST_EMPTY',
					embeds: [],
					components: [],
				}),
			);
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
			Stockpile.find.mockReturnValue({
				sort: jest.fn().mockResolvedValue([{ id: '1' }]),
			});
			const interaction = createInteraction('list');
			interaction.followUp.mockResolvedValue({ id: 'msg-new' });
			await stockpileCommand.execute(interaction);
			expect(interaction.deferReply).toHaveBeenCalledWith();
			expect(interaction.editReply).toHaveBeenCalledWith(expect.objectContaining({ embeds: [fakeEmbed] }));
			expect(mockSaveTrackedMessage).toHaveBeenCalled();
		});

		it('édite le message existant pour list au lieu de reply quand trouvé', async () => {
			const fakeEmbed = { toJSON: () => ({ title: 'List' }) };
			mockBuildStockpileListEmbed.mockResolvedValue({ embed: fakeEmbed, isEmpty: false });
			Stockpile.find.mockReturnValue({
				sort: jest.fn().mockResolvedValue([{ id: '1' }]),
			});
			const editMock = jest.fn().mockResolvedValue(undefined);
			mockFindTrackedMessage.mockResolvedValue({ edit: editMock });
			const interaction = createInteraction('list');
			await stockpileCommand.execute(interaction);
			expect(editMock).toHaveBeenCalledWith(expect.objectContaining({ embeds: [fakeEmbed] }));
			expect(interaction.editReply).not.toHaveBeenCalled();
			expect(interaction.deleteReply).toHaveBeenCalled();
		});
	});

	describe('cleanup - permission et isolation serveur/canal', () => {
		it('refuse si l’utilisateur n’a pas ManageChannels', async () => {
			const interaction = createInteraction('cleanup');
			interaction.member.permissions.has.mockReturnValue(false);
			await stockpileCommand.execute(interaction);
			expect(Stockpile.deleteMany).not.toHaveBeenCalled();
			expect(interaction.reply).toHaveBeenCalledWith(
				expect.objectContaining({ content: 'NO_PERMS', flags: 64 }),
			);
		});

		it('supprime uniquement les stocks marqués supprimés du serveur et du canal si ManageChannels', async () => {
			Stockpile.deleteMany.mockResolvedValue({ deletedCount: 2 });
			const interaction = createInteraction('cleanup');
			interaction.member.permissions.has.mockImplementation((perm) => perm === PermissionFlagsBits.ManageChannels);
			await stockpileCommand.execute(interaction);
			expect(Stockpile.deleteMany).toHaveBeenCalledWith({
				server_id: 'guild-123',
				group_id: 'channel-456',
				deleted: true,
			});
			expect(mockTranslate).toHaveBeenCalledWith('STOCKPILE_CLEANUP_SUCCESS', { count: 2 });
			expect(interaction.reply).toHaveBeenCalledWith(
				expect.objectContaining({ content: 'STOCKPILE_CLEANUP_SUCCESS', flags: 64 }),
			);
		});
	});

	describe('deleteall - permission et isolation serveur', () => {
		it('refuse si l’utilisateur n’a pas ManageGuild', async () => {
			const interaction = createInteraction('deleteall');
			interaction.member.permissions.has.mockReturnValue(false);
			await stockpileCommand.execute(interaction);
			expect(Stockpile.deleteMany).not.toHaveBeenCalled();
			expect(interaction.reply).toHaveBeenCalledWith(
				expect.objectContaining({ content: 'NO_PERMS', flags: 64 }),
			);
		});

		it('supprime uniquement les stocks du serveur courant si ManageGuild', async () => {
			Stockpile.deleteMany.mockResolvedValue({ deletedCount: 10 });
			const interaction = createInteraction('deleteall');
			interaction.member.permissions.has.mockImplementation((perm) => perm === PermissionFlagsBits.ManageGuild);
			await stockpileCommand.execute(interaction);
			expect(Stockpile.deleteMany).toHaveBeenCalledWith({ server_id: 'guild-123' });
			expect(TrackedMessage.deleteMany).toHaveBeenCalledWith({ server_id: 'guild-123' });
			expect(interaction.reply).toHaveBeenCalledWith(
				expect.objectContaining({ content: 'STOCKPILE_RESET_ALL_SUCCESS', flags: 64 }),
			);
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
