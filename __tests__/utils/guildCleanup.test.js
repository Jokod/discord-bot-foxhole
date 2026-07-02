const mockDeleteMany = jest.fn().mockResolvedValue({ deletedCount: 0 });
const mockStatsFindOne = jest.fn();
const mockStatsUpdateOne = jest.fn().mockResolvedValue({});
const mockStatsDeleteOne = jest.fn().mockResolvedValue({});
const mockStatsDeleteMany = jest.fn().mockResolvedValue({ deletedCount: 0 });

jest.mock('../../data/models.js', () => ({
	Material: { deleteMany: mockDeleteMany },
	Group: { deleteMany: mockDeleteMany },
	Operation: { deleteMany: mockDeleteMany },
	NotificationSubscription: { deleteMany: mockDeleteMany },
	TrackedMessage: { deleteMany: mockDeleteMany },
	Stockpile: { deleteMany: mockDeleteMany },
	Server: { deleteMany: mockDeleteMany },
	Stats: {
		findOne: (...args) => mockStatsFindOne(...args),
		updateOne: (...args) => mockStatsUpdateOne(...args),
		deleteOne: (...args) => mockStatsDeleteOne(...args),
		deleteMany: (...args) => mockStatsDeleteMany(...args),
	},
}));

const { cleanupGuildData, purgeEmptyStatsRecords } = require('../../utils/guildCleanup.js');

describe('cleanupGuildData', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('ne crée pas de document Stats s\'il n\'existe pas', async () => {
		mockStatsFindOne.mockResolvedValue(null);

		await cleanupGuildData('guild-new', { markLeftAt: true, guildName: 'Ignored' });

		expect(mockStatsUpdateOne).not.toHaveBeenCalled();
		expect(mockStatsDeleteOne).not.toHaveBeenCalled();
	});

	it('supprime un document Stats si name est vide', async () => {
		mockStatsFindOne.mockResolvedValue({
			guild_id: 'guild-empty',
			name: '',
			command_count: 42,
		});

		await cleanupGuildData('guild-empty', { markLeftAt: true });

		expect(mockStatsDeleteOne).toHaveBeenCalledWith({ guild_id: 'guild-empty' });
		expect(mockStatsUpdateOne).not.toHaveBeenCalled();
	});

	it('met à jour left_at si name est renseigné', async () => {
		mockStatsFindOne.mockResolvedValue({
			guild_id: 'guild-active',
			name: 'Active Server',
			command_count: 5,
		});

		await cleanupGuildData('guild-active', { markLeftAt: true, guildName: 'Active Server' });

		expect(mockStatsUpdateOne).toHaveBeenCalledWith(
			{ guild_id: 'guild-active' },
			{ $set: expect.objectContaining({ left_at: expect.any(Date), name: 'Active Server' }) },
		);
		expect(mockStatsDeleteOne).not.toHaveBeenCalled();
	});
});

describe('purgeEmptyStatsRecords', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('supprime tous les Stats avec name vide ou null', async () => {
		mockStatsDeleteMany.mockResolvedValue({ deletedCount: 12 });

		const count = await purgeEmptyStatsRecords();

		expect(count).toBe(12);
		expect(mockStatsDeleteMany).toHaveBeenCalledWith({
			$or: [{ name: '' }, { name: null }],
		});
	});
});
