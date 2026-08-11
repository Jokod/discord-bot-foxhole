const mockDeleteMany = jest.fn().mockResolvedValue({ deletedCount: 0 });
const mockStatsFindOne = jest.fn();
const mockStatsUpdateOne = jest.fn().mockResolvedValue({});
const mockStatsDeleteOne = jest.fn().mockResolvedValue({});
const mockStatsDeleteMany = jest.fn().mockResolvedValue({ deletedCount: 0 });

jest.mock('../../data/models.js', () => ({
	OrderLine: { deleteMany: mockDeleteMany },
	OrderBoard: { deleteMany: mockDeleteMany },
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

	it('utilise les defaults reason=unknown et markLeftAt=true', async () => {
		mockStatsFindOne.mockResolvedValue(null);
		mockDeleteMany.mockResolvedValue({});
		const logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);

		await cleanupGuildData('guild-default');

		expect(mockStatsFindOne).toHaveBeenCalled();
		expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('reason=unknown'));
		logSpy.mockRestore();
	});

	it('ne touche pas Stats si markLeftAt=false', async () => {
		mockStatsFindOne.mockResolvedValue({ guild_id: 'g1', name: 'Guild' });
		await cleanupGuildData('g1', { markLeftAt: false });
		expect(mockStatsFindOne).not.toHaveBeenCalled();
	});

	it('supprime Stats si name est null', async () => {
		mockStatsFindOne.mockResolvedValue({ guild_id: 'g-null', name: null });
		await cleanupGuildData('g-null', { markLeftAt: true });
		expect(mockStatsDeleteOne).toHaveBeenCalledWith({ guild_id: 'g-null' });
	});

	it('met à jour ownerId seul ou guildName seul', async () => {
		mockStatsFindOne.mockResolvedValue({ guild_id: 'g2', name: 'Old' });
		await cleanupGuildData('g2', { markLeftAt: true, ownerId: 'owner-x' });
		expect(mockStatsUpdateOne).toHaveBeenCalledWith(
			{ guild_id: 'g2' },
			{ $set: { left_at: expect.any(Date), owner_id: 'owner-x' } },
		);

		mockStatsUpdateOne.mockClear();
		mockStatsFindOne.mockResolvedValue({ guild_id: 'g3', name: 'Old' });
		await cleanupGuildData('g3', { markLeftAt: true, guildName: 'New Name' });
		expect(mockStatsUpdateOne).toHaveBeenCalledWith(
			{ guild_id: 'g3' },
			{ $set: { left_at: expect.any(Date), name: 'New Name' } },
		);
	});

	it('log avec guildId seul si pas de guildName', async () => {
		mockStatsFindOne.mockResolvedValue(null);
		mockDeleteMany.mockResolvedValue({});
		const logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
		await cleanupGuildData('guild-id-only', { markLeftAt: false });
		expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('guild-id-only reason='));
		logSpy.mockRestore();
	});

	it('gère deletedCount absent dans deleteMany', async () => {
		mockStatsFindOne.mockResolvedValue(null);
		mockDeleteMany.mockResolvedValue({});
		const logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
		await cleanupGuildData('g-zero', { markLeftAt: false });
		expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('orderLines=0'));
		logSpy.mockRestore();
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

	it('purgeEmptyStatsRecords fallback deletedCount null', async () => {
		mockStatsDeleteMany.mockResolvedValue({});
		await expect(purgeEmptyStatsRecords()).resolves.toBe(0);
	});
});
