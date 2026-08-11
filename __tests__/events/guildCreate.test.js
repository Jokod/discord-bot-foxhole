'use strict';

jest.mock('../../utils/blockedGuilds.js', () => ({
	getBlockedGuildIds: jest.fn(),
}));
jest.mock('../../utils/guildCleanup.js', () => ({
	cleanupGuildData: jest.fn(),
}));
jest.mock('../../data/models.js', () => ({
	Stats: { findOneAndUpdate: jest.fn() },
}));

const { getBlockedGuildIds } = require('../../utils/blockedGuilds.js');
const { cleanupGuildData } = require('../../utils/guildCleanup.js');
const { Stats } = require('../../data/models.js');
const guildCreate = require('../../events/guildCreate.js');

describe('guildCreate event', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		jest.spyOn(console, 'log').mockImplementation(() => undefined);
		jest.spyOn(console, 'error').mockImplementation(() => undefined);
	});

	afterEach(() => {
		console.log.mockRestore();
		console.error.mockRestore();
	});

	it('quitte et nettoie si le serveur est blacklisté', async () => {
		getBlockedGuildIds.mockResolvedValue(new Set(['g-blocked']));
		cleanupGuildData.mockResolvedValue(undefined);
		const leave = jest.fn().mockResolvedValue(undefined);
		const guild = {
			id: 'g-blocked',
			name: 'Blocked Guild',
			leave,
		};

		await guildCreate.execute(guild);

		expect(cleanupGuildData).toHaveBeenCalledWith('g-blocked', {
			reason: 'blocked_guild_join',
			markLeftAt: true,
			guildName: 'Blocked Guild',
		});
		expect(leave).toHaveBeenCalled();
		expect(Stats.findOneAndUpdate).not.toHaveBeenCalled();
	});

	it('log une erreur si leave échoue sur serveur blacklisté', async () => {
		getBlockedGuildIds.mockResolvedValue(new Set(['g-blocked']));
		cleanupGuildData.mockResolvedValue(undefined);
		const guild = {
			id: 'g-blocked',
			name: 'Blocked Guild',
			leave: jest.fn().mockRejectedValue(new Error('no permission')),
		};

		await guildCreate.execute(guild);

		expect(console.error).toHaveBeenCalledWith(
			expect.stringContaining('[Blocked]'),
			'no permission',
		);
	});

	it('cleanup blacklisté utilise guild.id si name absent', async () => {
		getBlockedGuildIds.mockResolvedValue(new Set(['g-blocked']));
		cleanupGuildData.mockResolvedValue(undefined);
		const leave = jest.fn().mockResolvedValue(undefined);
		const guild = {
			id: 'g-blocked',
			name: null,
			leave,
		};

		await guildCreate.execute(guild);

		expect(cleanupGuildData).toHaveBeenCalledWith('g-blocked', expect.objectContaining({
			guildName: 'g-blocked',
		}));
		expect(leave).toHaveBeenCalled();
	});

	it('upsert stats quand le serveur n est pas blacklisté', async () => {
		getBlockedGuildIds.mockResolvedValue(new Set());
		Stats.findOneAndUpdate.mockResolvedValue({});
		const joinedAt = new Date('2024-01-01');
		const guild = {
			id: 'g-new',
			name: 'New Guild',
			createdAt: new Date('2020-01-01'),
			memberCount: 42,
			ownerId: 'owner-1',
			members: { me: { joinedAt } },
		};

		await guildCreate.execute(guild);

		expect(Stats.findOneAndUpdate).toHaveBeenCalledWith(
			{ guild_id: 'g-new' },
			expect.objectContaining({
				$set: expect.objectContaining({
					guild_id: 'g-new',
					name: 'New Guild',
					joined_at: joinedAt,
					owner_id: 'owner-1',
					member_count: 42,
				}),
			}),
			{ upsert: true, returnDocument: 'after' },
		);
	});

	it('upsert stats sans ownerId si absent', async () => {
		getBlockedGuildIds.mockResolvedValue(new Set());
		Stats.findOneAndUpdate.mockResolvedValue({});
		const guild = {
			id: 'g-no-owner',
			name: null,
			createdAt: new Date(),
			memberCount: undefined,
			members: { me: null },
		};

		await guildCreate.execute(guild);

		const update = Stats.findOneAndUpdate.mock.calls[0][1].$set;
		expect(update.owner_id).toBeUndefined();
		expect(update.member_count).toBe(0);
		expect(update.joined_at).toBeInstanceOf(Date);
	});
});
