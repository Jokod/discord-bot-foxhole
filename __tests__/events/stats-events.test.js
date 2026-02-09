const mockStatsFindOneAndUpdate = jest.fn().mockResolvedValue({});

jest.mock('../../data/models.js', () => ({
	Server: { findOne: jest.fn().mockResolvedValue({}) },
	Stats: { findOneAndUpdate: mockStatsFindOneAndUpdate },
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
				{ upsert: true, new: true, updatePipeline: true },
			);
		});

		it('should not call Stats.findOneAndUpdate when interaction has no guild', async () => {
			jest.resetModules();
			const { Server, Stats } = require('../../data/models.js');
			Server.findOne = jest.fn().mockResolvedValue({});
			Stats.findOneAndUpdate = mockStatsFindOneAndUpdate;

			const slashCreate = require('../../events/slashCreate.js');
			const interaction = {
				isChatInputCommand: () => true,
				guild: null,
				commandName: 'help',
				client: {
					slashCommands: new Map([
						['help', { execute: jest.fn().mockResolvedValue(undefined), init: false }],
					]),
				},
			};

			await expect(slashCreate.execute(interaction)).rejects.toThrow();
			expect(mockStatsFindOneAndUpdate).not.toHaveBeenCalled();
		});
	});

	describe('guildCreate', () => {
		beforeEach(() => {
			jest.clearAllMocks();
			mockStatsFindOneAndUpdate.mockResolvedValue({});
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
						member_count: 120,
					},
				},
				{ upsert: true, new: true },
			);
		});
	});

	describe('onReady – backfill stats', () => {
		beforeEach(() => {
			jest.clearAllMocks();
			mockStatsFindOneAndUpdate.mockResolvedValue({});
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
				{ upsert: true, new: true },
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
				{ upsert: true, new: true },
			);
			// guild-b has no joinedAt so $set should not include joined_at
			const call2 = mockStatsFindOneAndUpdate.mock.calls[1];
			expect(call2[1].$set).not.toHaveProperty('joined_at');
		});
	});
});
