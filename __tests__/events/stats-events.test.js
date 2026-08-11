const mockStatsFindOneAndUpdate = jest.fn().mockResolvedValue({});
const mockStatsFind = jest.fn().mockResolvedValue([]);
const mockStatsUpdateOne = jest.fn().mockResolvedValue({});
const mockStatsDistinct = jest.fn().mockResolvedValue([]);
const mockDistinctEmpty = jest.fn().mockResolvedValue([]);
const mockCleanupGuildData = jest.fn().mockResolvedValue(undefined);
const mockPurgeEmptyStatsRecords = jest.fn().mockResolvedValue(0);

jest.mock('../../data/models.js', () => ({
	Server: { findOne: jest.fn().mockResolvedValue({}), distinct: mockDistinctEmpty },
	OrderLine: { distinct: mockDistinctEmpty },
	OrderBoard: { distinct: mockDistinctEmpty },
	Operation: { distinct: mockDistinctEmpty },
	NotificationSubscription: { distinct: mockDistinctEmpty },
	TrackedMessage: { distinct: mockDistinctEmpty },
	Stockpile: { distinct: mockDistinctEmpty },
	Stats: {
		findOneAndUpdate: mockStatsFindOneAndUpdate,
		find: mockStatsFind,
		distinct: mockStatsDistinct,
		updateOne: mockStatsUpdateOne,
	},
}));

jest.mock('../../utils/guildCleanup.js', () => ({
	cleanupGuildData: mockCleanupGuildData,
	purgeEmptyStatsRecords: mockPurgeEmptyStatsRecords,
}));

jest.mock('../../utils/stockpileListSync.js', () => ({
	syncAllStockpileLists: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../utils/orderBoardSync.js', () => ({
	syncAllOrderBoards: jest.fn().mockResolvedValue({ ok: 0, fail: 0, total: 0 }),
}));

jest.mock('../../utils/translations.js', () => {
	const fn = jest.fn();
	fn.mockImplementation(() => ({ translate: jest.fn((k) => k) }));
	return fn;
});

describe('Stats events', () => {
	describe('slashCreate – stats update on command', () => {
		beforeEach(() => {
			jest.clearAllMocks();
			mockStatsFindOneAndUpdate.mockResolvedValue({});
		});

		it('should call Stats.findOneAndUpdate when slash command runs with a guild', async () => {
			jest.resetModules();
			const { Server, Stats } = require('../../data/models.js');
			Server.findOne = jest.fn().mockResolvedValue({});
			Stats.findOneAndUpdate = mockStatsFindOneAndUpdate;

			const guildCreatedAt = new Date('2020-01-15');
			const mockCommandExecute = jest.fn().mockResolvedValue(undefined);

			const slashCreate = require('../../events/slashCreate.js');
			const interaction = {
				isChatInputCommand: () => true,
				guild: {
					id: 'guild-123',
					name: 'My Server',
					createdAt: guildCreatedAt,
					memberCount: 50,
				},
				commandName: 'help',
				client: {
					slashCommands: new Map([
						[
							'help',
							{
								execute: mockCommandExecute,
								init: false,
							},
						],
					]),
				},
			};

			await slashCreate.execute(interaction);

			expect(mockCommandExecute).toHaveBeenCalledWith(interaction);
			expect(mockStatsFindOneAndUpdate).toHaveBeenCalledTimes(1);
			const updateArg = mockStatsFindOneAndUpdate.mock.calls[0][1];
			expect(Array.isArray(updateArg)).toBe(true);
			expect(updateArg).toHaveLength(2);
			expect(updateArg[0].$set).toMatchObject({
				name: 'My Server',
				created_at: guildCreatedAt,
				member_count: 50,
			});
			expect(updateArg[0].$set.first_command_at).toEqual({ $ifNull: ['$first_command_at', '$$NOW'] });
			expect(updateArg[0].$set.last_command_at).toBeDefined();
			expect(updateArg[0].$set['last_command_by_type.help']).toBeDefined();
			expect(updateArg[1].$set.command_count).toEqual({ $add: [{ $ifNull: ['$command_count', 0] }, 1] });
			expect(updateArg[1].$set['command_breakdown.help']).toEqual({ $add: [{ $ifNull: ['$command_breakdown.help', 0] }, 1] });
			expect(mockStatsFindOneAndUpdate).toHaveBeenCalledWith(
				{ guild_id: 'guild-123' },
				expect.any(Array),
				{ upsert: true, returnDocument: 'after', updatePipeline: true },
			);
		});

		it('should not call Stats.findOneAndUpdate when interaction has no guild', async () => {
			jest.resetModules();
			const { Server, Stats } = require('../../data/models.js');
			Server.findOne = jest.fn().mockResolvedValue({});
			Stats.findOneAndUpdate = mockStatsFindOneAndUpdate;

			const slashCreate = require('../../events/slashCreate.js');
			const execute = jest.fn().mockResolvedValue(undefined);
			const interaction = {
				isChatInputCommand: () => true,
				guild: null,
				commandName: 'help',
				client: {
					slashCommands: new Map([
						['help', { execute, init: false }],
					]),
				},
			};

			await slashCreate.execute(interaction);
			expect(execute).toHaveBeenCalled();
			expect(mockStatsFindOneAndUpdate).not.toHaveBeenCalled();
		});

		it('should return early when interaction is not a chat input command', async () => {
			jest.resetModules();
			const slashCreate = require('../../events/slashCreate.js');
			const interaction = {
				isChatInputCommand: () => false,
				client: { slashCommands: new Map() },
			};

			await slashCreate.execute(interaction);
			expect(mockStatsFindOneAndUpdate).not.toHaveBeenCalled();
		});

		it('should return early when command is not found', async () => {
			jest.resetModules();
			const { Server } = require('../../data/models.js');
			Server.findOne = jest.fn().mockResolvedValue({});
			const slashCreate = require('../../events/slashCreate.js');
			const interaction = {
				isChatInputCommand: () => true,
				guild: { id: 'guild-123' },
				commandName: 'missing',
				client: { slashCommands: new Map() },
				reply: jest.fn(),
			};

			await slashCreate.execute(interaction);
			expect(interaction.reply).not.toHaveBeenCalled();
			expect(mockStatsFindOneAndUpdate).not.toHaveBeenCalled();
		});

		it('should reply SERVER_IS_NOT_INIT when command.init and no server', async () => {
			jest.resetModules();
			const { Server } = require('../../data/models.js');
			Server.findOne = jest.fn().mockResolvedValue(null);
			const slashCreate = require('../../events/slashCreate.js');
			const interaction = {
				isChatInputCommand: () => true,
				guild: { id: 'guild-123' },
				commandName: 'order',
				client: {
					slashCommands: new Map([
						['order', { execute: jest.fn(), init: true }],
					]),
				},
				reply: jest.fn().mockResolvedValue(undefined),
			};

			await slashCreate.execute(interaction);
			expect(interaction.reply).toHaveBeenCalledWith({
				content: 'SERVER_IS_NOT_INIT',
				flags: 64,
			});
		});

		it('should followUp COMMAND_EXECUTE_ERROR when command throws after defer', async () => {
			jest.resetModules();
			const { Server, Stats } = require('../../data/models.js');
			Server.findOne = jest.fn().mockResolvedValue({});
			Stats.findOneAndUpdate = mockStatsFindOneAndUpdate;
			const slashCreate = require('../../events/slashCreate.js');
			const execute = jest.fn().mockRejectedValue(new Error('Boom'));
			const followUp = jest.fn().mockResolvedValue(undefined);
			const interaction = {
				isChatInputCommand: () => true,
				guild: { id: 'guild-123', name: 'G', createdAt: new Date(), memberCount: 1 },
				commandName: 'help',
				replied: false,
				deferred: true,
				reply: jest.fn(),
				followUp,
				client: {
					slashCommands: new Map([
						['help', { execute, init: false }],
					]),
				},
			};
			const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);

			await slashCreate.execute(interaction);

			expect(followUp).toHaveBeenCalledWith({
				content: 'COMMAND_EXECUTE_ERROR',
				flags: 64,
			});
			consoleSpy.mockRestore();
		});

		it('should reply COMMAND_EXECUTE_ERROR when command throws before reply', async () => {
			jest.resetModules();
			const { Server, Stats } = require('../../data/models.js');
			Server.findOne = jest.fn().mockResolvedValue({});
			Stats.findOneAndUpdate = mockStatsFindOneAndUpdate;
			const slashCreate = require('../../events/slashCreate.js');
			const execute = jest.fn().mockRejectedValue(new Error('Boom'));
			const reply = jest.fn().mockResolvedValue(undefined);
			const interaction = {
				isChatInputCommand: () => true,
				guild: { id: 'guild-123', name: 'G', createdAt: new Date(), memberCount: 1 },
				commandName: 'help',
				replied: false,
				deferred: false,
				reply,
				followUp: jest.fn(),
				client: {
					slashCommands: new Map([
						['help', { execute, init: false }],
					]),
				},
			};
			const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);

			await slashCreate.execute(interaction);

			expect(reply).toHaveBeenCalledWith({
				content: 'COMMAND_EXECUTE_ERROR',
				flags: 64,
			});
			consoleSpy.mockRestore();
		});

		it('should log when error reply also fails', async () => {
			jest.resetModules();
			const { Server } = require('../../data/models.js');
			Server.findOne = jest.fn().mockResolvedValue({});
			const slashCreate = require('../../events/slashCreate.js');
			const execute = jest.fn().mockRejectedValue(new Error('Boom'));
			const reply = jest.fn().mockRejectedValue(new Error('Reply failed'));
			const interaction = {
				isChatInputCommand: () => true,
				guild: { id: 'guild-123' },
				commandName: 'help',
				replied: false,
				deferred: false,
				reply,
				followUp: jest.fn(),
				client: {
					slashCommands: new Map([
						['help', { execute, init: false }],
					]),
				},
			};
			const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);

			await slashCreate.execute(interaction);

			expect(consoleSpy).toHaveBeenCalledWith(
				'Failed to send error message to interaction:',
				expect.any(Error),
			);
			consoleSpy.mockRestore();
		});

		it('should default member_count to 0 when guild.memberCount is undefined', async () => {
			jest.resetModules();
			const { Server, Stats } = require('../../data/models.js');
			Server.findOne = jest.fn().mockResolvedValue({});
			Stats.findOneAndUpdate = mockStatsFindOneAndUpdate;

			const slashCreate = require('../../events/slashCreate.js');
			const interaction = {
				isChatInputCommand: () => true,
				guild: {
					id: 'guild-123',
					name: 'My Server',
					createdAt: new Date(),
					memberCount: undefined,
				},
				commandName: 'help',
				client: {
					slashCommands: new Map([
						['help', { execute: jest.fn().mockResolvedValue(undefined), init: false }],
					]),
				},
			};

			await slashCreate.execute(interaction);

			expect(mockStatsFindOneAndUpdate.mock.calls[0][1][0].$set.member_count).toBe(0);
		});
	});

	describe('guildCreate', () => {
		beforeEach(() => {
			jest.clearAllMocks();
			mockStatsFindOneAndUpdate.mockResolvedValue({});
			mockCleanupGuildData.mockResolvedValue(undefined);
		});

		it('should upsert Stats with guild info and joined_at when bot joins a guild', async () => {
			jest.resetModules();
			const { Stats } = require('../../data/models.js');
			Stats.findOneAndUpdate = mockStatsFindOneAndUpdate;

			const guildCreatedAt = new Date('2019-06-01');
			const joinedAt = new Date('2024-02-01');

			const guildCreate = require('../../events/guildCreate.js');
			const guild = {
				id: 'new-guild-456',
				name: 'New Server',
				createdAt: guildCreatedAt,
				memberCount: 120,
				members: {
					me: { joinedAt },
				},
			};

			await guildCreate.execute(guild);

			expect(mockStatsFindOneAndUpdate).toHaveBeenCalledTimes(1);
			expect(mockStatsFindOneAndUpdate).toHaveBeenCalledWith(
				{ guild_id: 'new-guild-456' },
				{
					$set: {
						guild_id: 'new-guild-456',
						name: 'New Server',
						created_at: guildCreatedAt,
						joined_at: joinedAt,
						left_at: null,
						member_count: 120,
					},
				},
				{ upsert: true, returnDocument: 'after' },
			);
		});

		it('should leave guild and not update Stats when guild is in BLOCKED_GUILD_IDS', async () => {
			jest.resetModules();
			const { Stats } = require('../../data/models.js');
			Stats.findOneAndUpdate = mockStatsFindOneAndUpdate;

			const guildCreate = require('../../events/guildCreate.js');
			const leave = jest.fn().mockResolvedValue(undefined);
			const guild = {
				id: 'blocked-guild-789',
				name: 'Blocked Server',
				createdAt: new Date(),
				memberCount: 10,
				members: { me: { joinedAt: new Date() } },
				leave,
			};

			const prev = process.env.BLOCKED_GUILD_IDS;
			process.env.BLOCKED_GUILD_IDS = 'blocked-guild-789';
			await guildCreate.execute(guild);
			process.env.BLOCKED_GUILD_IDS = prev;

			expect(leave).toHaveBeenCalledTimes(1);
			expect(mockCleanupGuildData).toHaveBeenCalledWith(
				'blocked-guild-789',
				expect.objectContaining({
					reason: 'blocked_guild_join',
					markLeftAt: true,
					guildName: 'Blocked Server',
				}),
			);
			expect(mockStatsFindOneAndUpdate).not.toHaveBeenCalled();
		});

		it('should fallback joined_at and member_count when data is missing', async () => {
			jest.resetModules();
			const { Stats } = require('../../data/models.js');
			Stats.findOneAndUpdate = mockStatsFindOneAndUpdate;

			const guildCreatedAt = new Date('2022-01-01');

			const guildCreate = require('../../events/guildCreate.js');
			const guild = {
				id: 'new-guild-789',
				name: 'Fallback Server',
				createdAt: guildCreatedAt,
				memberCount: undefined,
				members: {
					me: null,
				},
			};

			await guildCreate.execute(guild);

			expect(mockStatsFindOneAndUpdate).toHaveBeenCalledTimes(1);
			const callArgs = mockStatsFindOneAndUpdate.mock.calls[0];
			const set = callArgs[1].$set;
			expect(set.guild_id).toBe('new-guild-789');
			expect(set.name).toBe('Fallback Server');
			expect(set.created_at).toBe(guildCreatedAt);
			expect(set.joined_at).toBeInstanceOf(Date);
			expect(set.member_count).toBe(0);
		});

		it('should log error if leaving blocked guild fails', async () => {
			jest.resetModules();
			const { Stats } = require('../../data/models.js');
			Stats.findOneAndUpdate = mockStatsFindOneAndUpdate;

			const guildCreate = require('../../events/guildCreate.js');
			const leaveError = new Error('leave failed');
			const leave = jest.fn().mockRejectedValueOnce(leaveError);
			const guild = {
				id: 'blocked-guild-error',
				name: 'Blocked Error Server',
				createdAt: new Date(),
				memberCount: 5,
				members: { me: { joinedAt: new Date() } },
				leave,
			};

			const prev = process.env.BLOCKED_GUILD_IDS;
			process.env.BLOCKED_GUILD_IDS = 'blocked-guild-error';
			const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);

			await guildCreate.execute(guild);

			process.env.BLOCKED_GUILD_IDS = prev;
			consoleErrorSpy.mockRestore();

			expect(leave).toHaveBeenCalledTimes(1);
			expect(mockStatsFindOneAndUpdate).not.toHaveBeenCalled();
		});
	});

	describe('guildDelete', () => {
		beforeEach(() => {
			jest.clearAllMocks();
			mockCleanupGuildData.mockResolvedValue(undefined);
		});

		it('should clean guild data when bot is removed from a guild', async () => {
			jest.resetModules();
			const guildDelete = require('../../events/guildDelete.js');
			const guild = {
				id: 'removed-guild-999',
				name: 'Removed Server',
			};

			await guildDelete.execute(guild);

			expect(mockCleanupGuildData).toHaveBeenCalledTimes(1);
			expect(mockCleanupGuildData).toHaveBeenCalledWith(
				'removed-guild-999',
				expect.objectContaining({ reason: 'guild_delete', markLeftAt: true, guildName: 'Removed Server' }),
			);
		});

		it('should log error when cleanup fails', async () => {
			jest.resetModules();
			const cleanupError = new Error('cleanup failed');
			mockCleanupGuildData.mockRejectedValueOnce(cleanupError);

			const guildDelete = require('../../events/guildDelete.js');
			const guild = {
				id: 'removed-guild-error',
				name: 'Removed Error Server',
			};

			const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);

			await guildDelete.execute(guild);

			consoleErrorSpy.mockRestore();

			expect(mockCleanupGuildData).toHaveBeenCalledTimes(1);
			expect(mockCleanupGuildData).toHaveBeenCalledWith(
				'removed-guild-error',
				expect.objectContaining({ reason: 'guild_delete', markLeftAt: true, guildName: 'Removed Error Server' }),
			);
		});
	});

	describe('onReady – backfill stats', () => {
		beforeEach(() => {
			jest.clearAllMocks();
			mockStatsFindOneAndUpdate.mockResolvedValue({});
			mockCleanupGuildData.mockResolvedValue(undefined);
			mockPurgeEmptyStatsRecords.mockResolvedValue(0);
		});

		it('should purge empty Stats records on ready', async () => {
			jest.resetModules();
			mockPurgeEmptyStatsRecords.mockResolvedValue(7);

			const onReady = require('../../events/onReady.js');
			const client = {
				user: { tag: 'Bot#1234' },
				guilds: { cache: new Map() },
			};

			await onReady.execute(client);

			expect(mockPurgeEmptyStatsRecords).toHaveBeenCalled();
		});

		it('should upsert Stats for each guild in cache on ready', async () => {
			jest.resetModules();
			const { Stats } = require('../../data/models.js');
			Stats.findOneAndUpdate = mockStatsFindOneAndUpdate;

			const guild1Created = new Date('2020-01-01');
			const guild1Joined = new Date('2023-05-01');

			const onReady = require('../../events/onReady.js');
			const client = {
				user: { tag: 'Bot#1234' },
				guilds: {
					cache: new Map([
						[
							'guild-a',
							{
								id: 'guild-a',
								name: 'Server A',
								createdAt: guild1Created,
								joinedAt: guild1Joined,
								memberCount: 200,
								members: { me: { joinedAt: guild1Joined } },
							},
						],
						[
							'guild-b',
							{
								id: 'guild-b',
								name: 'Server B',
								createdAt: new Date('2021-03-01'),
								joinedAt: null,
								memberCount: 50,
								members: { me: null },
							},
						],
					]),
				},
			};

			await onReady.execute(client);

			expect(mockStatsFindOneAndUpdate).toHaveBeenCalledTimes(2);

			expect(mockStatsFindOneAndUpdate).toHaveBeenNthCalledWith(
				1,
				{ guild_id: 'guild-a' },
				expect.objectContaining({
					$set: expect.objectContaining({
						guild_id: 'guild-a',
						name: 'Server A',
						created_at: guild1Created,
						member_count: 200,
						joined_at: guild1Joined,
					}),
				}),
				{ upsert: true, returnDocument: 'after' },
			);

			expect(mockStatsFindOneAndUpdate).toHaveBeenNthCalledWith(
				2,
				{ guild_id: 'guild-b' },
				expect.objectContaining({
					$set: expect.objectContaining({
						guild_id: 'guild-b',
						name: 'Server B',
						member_count: 50,
					}),
				}),
				{ upsert: true, returnDocument: 'after' },
			);
			// guild-b has no joinedAt so $set should not include joined_at
			const call2 = mockStatsFindOneAndUpdate.mock.calls[1];
			expect(call2[1].$set).not.toHaveProperty('joined_at');
		});

		it('should clean orphaned guild found via Server.distinct', async () => {
			jest.resetModules();
			const { Stats, Server, OrderLine, OrderBoard, Operation, NotificationSubscription, TrackedMessage, Stockpile } = require('../../data/models.js');
			Stats.findOneAndUpdate = mockStatsFindOneAndUpdate;
			Stats.find = mockStatsFind;
			Stats.distinct = mockStatsDistinct;
			// Server.distinct returns an orphaned guild_id
			Server.distinct = jest.fn().mockResolvedValue(['old-guild-123']);
			OrderLine.distinct = jest.fn().mockResolvedValue([]);
			OrderBoard.distinct = jest.fn().mockResolvedValue([]);
			Operation.distinct = jest.fn().mockResolvedValue([]);
			NotificationSubscription.distinct = jest.fn().mockResolvedValue([]);
			TrackedMessage.distinct = jest.fn().mockResolvedValue([]);
			Stockpile.distinct = jest.fn().mockResolvedValue([]);
			mockStatsDistinct.mockResolvedValue([]);
			mockStatsFind.mockResolvedValueOnce([{ guild_id: 'old-guild-123', name: 'Old Guild 123' }]);

			const onReady = require('../../events/onReady.js');
			const client = {
				user: { tag: 'Bot#1234' },
				guilds: {
					cache: new Map([
						[
							'guild-a',
							{
								id: 'guild-a',
								name: 'Server A',
								createdAt: new Date(),
								memberCount: 1,
								members: { me: null },
							},
						],
					]),
				},
			};

			await onReady.execute(client);

			expect(mockCleanupGuildData).toHaveBeenCalledWith(
				'old-guild-123',
				expect.objectContaining({
					reason: 'orphaned_on_ready',
					markLeftAt: true,
					guildName: 'Old Guild 123',
				}),
			);
		});

		it('should not re-clean guilds already marked left with no app data', async () => {
			jest.resetModules();
			const { Stats, Server, OrderLine, OrderBoard, Operation, NotificationSubscription, TrackedMessage, Stockpile } = require('../../data/models.js');
			Stats.findOneAndUpdate = mockStatsFindOneAndUpdate;
			Stats.find = mockStatsFind;
			Stats.distinct = mockStatsDistinct;
			Server.distinct = jest.fn().mockResolvedValue([]);
			OrderLine.distinct = jest.fn().mockResolvedValue([]);
			OrderBoard.distinct = jest.fn().mockResolvedValue([]);
			Operation.distinct = jest.fn().mockResolvedValue([]);
			NotificationSubscription.distinct = jest.fn().mockResolvedValue([]);
			TrackedMessage.distinct = jest.fn().mockResolvedValue([]);
			Stockpile.distinct = jest.fn().mockResolvedValue([]);
			mockStatsDistinct.mockResolvedValue([]);

			const onReady = require('../../events/onReady.js');
			const client = {
				user: { tag: 'Bot#1234' },
				guilds: {
					cache: new Map([
						['guild-a', { id: 'guild-a', name: 'Server A', createdAt: new Date(), memberCount: 1, members: { me: null } }],
					]),
				},
			};

			await onReady.execute(client);

			expect(mockCleanupGuildData).not.toHaveBeenCalled();
			expect(Stats.distinct).toHaveBeenCalledWith(
				'guild_id',
				expect.objectContaining({ left_at: null }),
			);
		});

		it('should leave blacklisted guilds on ready', async () => {
			jest.resetModules();
			const { Stats, Server, OrderLine, OrderBoard, Operation, NotificationSubscription, TrackedMessage, Stockpile } = require('../../data/models.js');
			Stats.findOneAndUpdate = mockStatsFindOneAndUpdate;
			Stats.find = mockStatsFind;
			Stats.distinct = mockStatsDistinct;
			Server.distinct = jest.fn().mockResolvedValue([]);
			OrderLine.distinct = jest.fn().mockResolvedValue([]);
			OrderBoard.distinct = jest.fn().mockResolvedValue([]);
			Operation.distinct = jest.fn().mockResolvedValue([]);
			NotificationSubscription.distinct = jest.fn().mockResolvedValue([]);
			TrackedMessage.distinct = jest.fn().mockResolvedValue([]);
			Stockpile.distinct = jest.fn().mockResolvedValue([]);

			const leaveA = jest.fn().mockResolvedValue(undefined);
			const guildA = {
				id: 'guild-a',
				name: 'Server A',
				createdAt: new Date(),
				memberCount: 1,
				members: { me: null },
				leave: leaveA,
			};
			const client = {
				user: { tag: 'Bot#1234' },
				guilds: {
					cache: new Map([
						['guild-a', guildA],
						[
							'guild-b',
							{
								id: 'guild-b',
								name: 'Server B',
								createdAt: new Date(),
								memberCount: 1,
								members: { me: null },
								leave: jest.fn().mockResolvedValue(undefined),
							},
						],
					]),
				},
			};

			const prev = process.env.BLOCKED_GUILD_IDS;
			process.env.BLOCKED_GUILD_IDS = 'guild-a';
			const onReady = require('../../events/onReady.js');
			await onReady.execute(client);
			process.env.BLOCKED_GUILD_IDS = prev;

			expect(leaveA).toHaveBeenCalledTimes(1);
			expect(mockCleanupGuildData).toHaveBeenCalledWith(
				'guild-a',
				expect.objectContaining({ reason: 'blocked_guild_on_ready', markLeftAt: true, guildName: 'Server A' }),
			);
		});

		it('should log when leaving blocked guild fails on ready', async () => {
			jest.resetModules();
			const { Stats, Server, OrderLine, OrderBoard, Operation, NotificationSubscription, TrackedMessage, Stockpile } = require('../../data/models.js');
			Stats.findOneAndUpdate = mockStatsFindOneAndUpdate;
			Stats.find = mockStatsFind;
			Stats.distinct = mockStatsDistinct;
			Server.distinct = jest.fn().mockResolvedValue([]);
			OrderLine.distinct = jest.fn().mockResolvedValue([]);
			OrderBoard.distinct = jest.fn().mockResolvedValue([]);
			Operation.distinct = jest.fn().mockResolvedValue([]);
			NotificationSubscription.distinct = jest.fn().mockResolvedValue([]);
			TrackedMessage.distinct = jest.fn().mockResolvedValue([]);
			Stockpile.distinct = jest.fn().mockResolvedValue([]);

			const leave = jest.fn().mockRejectedValue(new Error('leave failed'));
			const client = {
				user: { tag: 'Bot#1234' },
				guilds: {
					cache: new Map([
						['guild-a', {
							id: 'guild-a',
							name: 'Server A',
							createdAt: new Date(),
							memberCount: 1,
							members: { me: null },
							leave,
						}],
					]),
				},
			};

			const prev = process.env.BLOCKED_GUILD_IDS;
			process.env.BLOCKED_GUILD_IDS = 'guild-a';
			const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
			const onReady = require('../../events/onReady.js');
			await onReady.execute(client);
			process.env.BLOCKED_GUILD_IDS = prev;

			expect(leave).toHaveBeenCalled();
			expect(consoleSpy).toHaveBeenCalledWith(
				'[Blocked] Impossible de quitter le serveur guild-a:',
				'leave failed',
			);
			consoleSpy.mockRestore();
		});

		it('should log stockpile and order board sync failures on ready', async () => {
			jest.resetModules();
			const { syncAllStockpileLists } = require('../../utils/stockpileListSync.js');
			const { syncAllOrderBoards } = require('../../utils/orderBoardSync.js');
			syncAllStockpileLists.mockRejectedValueOnce(new Error('stockpile fail'));
			syncAllOrderBoards.mockRejectedValueOnce(new Error('orderboard fail'));

			const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
			const onReady = require('../../events/onReady.js');
			const client = {
				user: { tag: 'Bot#1234' },
				guilds: { cache: new Map() },
			};

			await onReady.execute(client);
			await new Promise((resolve) => { setTimeout(resolve, 0); });
			await new Promise((resolve) => { setTimeout(resolve, 0); });

			expect(consoleSpy).toHaveBeenCalledWith(
				'[StockpileList] Échec de la synchronisation au démarrage:',
				expect.any(Error),
			);
			expect(consoleSpy).toHaveBeenCalledWith(
				'[OrderBoard] Échec de la synchronisation au démarrage:',
				expect.any(Error),
			);
			consoleSpy.mockRestore();
		});

		it('should log when syncAllOrderBoards module is unavailable', async () => {
			jest.resetModules();
			jest.doMock('../../utils/orderBoardSync.js', () => {
				throw new Error('module missing');
			});

			const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
			const onReady = require('../../events/onReady.js');
			const client = {
				user: { tag: 'Bot#1234' },
				guilds: { cache: new Map() },
			};

			await onReady.execute(client);

			expect(consoleSpy).toHaveBeenCalledWith(
				'[OrderBoard] syncAllOrderBoards indisponible:',
				'module missing',
			);
			consoleSpy.mockRestore();
			jest.dontMock('../../utils/orderBoardSync.js');
		});

		it('should log purged stats count when records were removed', async () => {
			jest.resetModules();
			mockPurgeEmptyStatsRecords.mockResolvedValue(3);
			const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
			const onReady = require('../../events/onReady.js');
			const client = {
				user: { tag: 'Bot#1234' },
				guilds: { cache: new Map() },
			};

			await onReady.execute(client);

			expect(consoleSpy).toHaveBeenCalledWith('[Stats] 3 fiche(s) Stats sans nom supprimée(s).');
			consoleSpy.mockRestore();
		});

		it('should include owner_id in stats upsert when available', async () => {
			jest.resetModules();
			const { Stats } = require('../../data/models.js');
			Stats.findOneAndUpdate = mockStatsFindOneAndUpdate;

			const onReady = require('../../events/onReady.js');
			const client = {
				user: { tag: 'Bot#1234' },
				guilds: {
					cache: new Map([
						['guild-owner', {
							id: 'guild-owner',
							name: 'Owner Server',
							createdAt: new Date(),
							memberCount: 10,
							ownerId: 'owner-999',
							members: { me: { joinedAt: new Date() } },
						}],
					]),
				},
			};

			await onReady.execute(client);

			expect(mockStatsFindOneAndUpdate).toHaveBeenCalledWith(
				{ guild_id: 'guild-owner' },
				expect.objectContaining({
					$set: expect.objectContaining({ owner_id: 'owner-999' }),
				}),
				{ upsert: true, returnDocument: 'after' },
			);
		});

		it('should log orphaned guild cleanup count', async () => {
			jest.resetModules();
			const { Stats, Server, OrderLine, OrderBoard, Operation, NotificationSubscription, TrackedMessage, Stockpile } = require('../../data/models.js');
			Stats.findOneAndUpdate = mockStatsFindOneAndUpdate;
			Stats.find = mockStatsFind;
			Stats.distinct = mockStatsDistinct;
			Server.distinct = jest.fn().mockResolvedValue(['orphan-1']);
			OrderLine.distinct = jest.fn().mockResolvedValue([]);
			OrderBoard.distinct = jest.fn().mockResolvedValue([]);
			Operation.distinct = jest.fn().mockResolvedValue([]);
			NotificationSubscription.distinct = jest.fn().mockResolvedValue([]);
			TrackedMessage.distinct = jest.fn().mockResolvedValue([]);
			Stockpile.distinct = jest.fn().mockResolvedValue([]);
			mockStatsDistinct.mockResolvedValue([]);
			mockStatsFind.mockResolvedValueOnce([{ guild_id: 'orphan-1', name: 'Orphan' }]);

			const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
			const onReady = require('../../events/onReady.js');
			const client = {
				user: { tag: 'Bot#1234' },
				guilds: { cache: new Map() },
			};

			await onReady.execute(client);

			expect(consoleSpy).toHaveBeenCalledWith('[Stats] 1 serveur(s) orphelin(s) nettoyé(s) au démarrage.');
			consoleSpy.mockRestore();
		});

		it('should use guild id fallback and member_count 0 for blocked guild without name/count', async () => {
			jest.resetModules();
			const { Stats, Server, OrderLine, OrderBoard, Operation, NotificationSubscription, TrackedMessage, Stockpile } = require('../../data/models.js');
			Stats.findOneAndUpdate = mockStatsFindOneAndUpdate;
			Stats.find = mockStatsFind;
			Stats.distinct = mockStatsDistinct;
			Server.distinct = jest.fn().mockResolvedValue([]);
			OrderLine.distinct = jest.fn().mockResolvedValue([]);
			OrderBoard.distinct = jest.fn().mockResolvedValue([]);
			Operation.distinct = jest.fn().mockResolvedValue([]);
			NotificationSubscription.distinct = jest.fn().mockResolvedValue([]);
			TrackedMessage.distinct = jest.fn().mockResolvedValue([]);
			Stockpile.distinct = jest.fn().mockResolvedValue([]);

			const leave = jest.fn().mockResolvedValue(undefined);
			const client = {
				user: { tag: 'Bot#1234' },
				guilds: {
					cache: new Map([
						['guild-a', {
							id: 'guild-a',
							name: null,
							createdAt: new Date(),
							memberCount: undefined,
							members: { me: null },
							leave,
						}],
					]),
				},
			};

			const prev = process.env.BLOCKED_GUILD_IDS;
			process.env.BLOCKED_GUILD_IDS = 'guild-a';
			const onReady = require('../../events/onReady.js');
			await onReady.execute(client);
			process.env.BLOCKED_GUILD_IDS = prev;

			expect(mockCleanupGuildData).toHaveBeenCalledWith(
				'guild-a',
				expect.objectContaining({ guildName: 'guild-a' }),
			);
			expect(mockStatsFindOneAndUpdate).toHaveBeenCalledWith(
				{ guild_id: 'guild-a' },
				expect.objectContaining({
					$set: expect.objectContaining({ member_count: 0 }),
				}),
				{ upsert: true, returnDocument: 'after' },
			);
		});
	});
});
