const mockTranslate = jest.fn((key) => key);

const { PermissionFlagsBits } = require('discord.js');

jest.mock('../../utils/translations.js', () => jest.fn().mockImplementation(() => ({ translate: mockTranslate })));

jest.mock('../../utils/colors.js', () => ({ getRandomColor: jest.fn().mockReturnValue(0xabcdef) }));

const mockBuildStockpileListEmbed = jest.fn();
jest.mock('../../interactions/embeds/stockpileList.js', () => ({ buildStockpileListEmbed: mockBuildStockpileListEmbed }));

jest.mock('../../utils/notifications.js', () => ({ sendToSubscribers: jest.fn().mockResolvedValue(undefined) }));

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
}));

const { Stockpile } = require('../../data/models.js');

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
		stockpileCommand = require('../../interactions/slash/stockpile/stockpile.js');
	});

	function createInteraction(subcommand, options = {}, overrides = {}) {
		const guild = { id: 'guild-123' };
		const channelId = 'channel-456';
		const userId = 'user-789';
		const getString = jest.fn((name) => (options[name] !== undefined ? options[name] : null));
		const getSubcommand = jest.fn(() => subcommand);
		return {
			client: { traductions: new Map(), slashCommands: new Map() },
			guild,
			channelId,
			user: { id: userId },
			options: { getSubcommand, getString },
			reply: jest.fn().mockResolvedValue(undefined),
			followUp: jest.fn().mockResolvedValue(undefined),
			member: {
				permissions: {
					has: jest.fn((perm) => perm === PermissionFlagsBits.ManageGuild),
				},
			},
			...overrides,
		};
	}

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
	});

	describe('reset - isolation serveur', () => {
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
	});

	describe('list - isolation serveur', () => {
		it('répond LIST_EMPTY et buildStockpileListEmbed est appelé avec guild.id', async () => {
			mockBuildStockpileListEmbed.mockResolvedValue({ embed: null, isEmpty: true });
			const interaction = createInteraction('list');
			await stockpileCommand.execute(interaction);
			expect(mockBuildStockpileListEmbed).toHaveBeenCalledWith(
				expect.anything(),
				'guild-123',
				expect.anything(),
			);
			expect(interaction.reply).toHaveBeenCalledWith(
				expect.objectContaining({ content: 'STOCKPILE_LIST_EMPTY', flags: 64 }),
			);
		});

		it('affiche l’embed quand la liste n’est pas vide', async () => {
			const fakeEmbed = { toJSON: () => ({ title: 'List' }) };
			mockBuildStockpileListEmbed.mockResolvedValue({ embed: fakeEmbed, isEmpty: false });
			const interaction = createInteraction('list');
			await stockpileCommand.execute(interaction);
			expect(interaction.reply).toHaveBeenCalledWith(expect.objectContaining({ embeds: [fakeEmbed] }));
		});
	});

	describe('cleanup - isolation serveur et canal', () => {
		it('supprime uniquement les stocks marqués supprimés du serveur et du canal', async () => {
			Stockpile.deleteMany.mockResolvedValue({ deletedCount: 2 });
			const interaction = createInteraction('cleanup');
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
			expect(interaction.reply).toHaveBeenCalledWith(
				expect.objectContaining({ content: 'STOCKPILE_RESET_ALL_SUCCESS', flags: 64 }),
			);
		});
	});
});
