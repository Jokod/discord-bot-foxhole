'use strict';

jest.mock('../../utils/guildCleanup', () => ({
	cleanupGuildData: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../utils/discordRest', () => ({
	leaveGuildRest: jest.fn(),
	sendChannelMessage: jest.fn(),
	fetchGuildChannels: jest.fn(),
	fetchGuild: jest.fn(),
}));

jest.mock('../../utils/blockedGuilds', () => ({
	getEnvBlockedGuildIds: jest.fn(() => new Set()),
	addBlockedGuilds: jest.fn().mockResolvedValue({ added: ['g1'], already: [] }),
	removeBlockedGuilds: jest.fn().mockResolvedValue({
		removed: ['g1'],
		skipped_env: [],
		missing: [],
	}),
}));

jest.mock('../../utils/announceChannels', () => ({
	collectKnownChannels: jest.fn(() => ['c1']),
	loadAnnounceChannelDocs: jest.fn().mockResolvedValue({
		notifs: [], tracked: [], boards: [], stockpiles: [], operations: [],
	}),
	listRestCandidateChannels: jest.fn(() => [
		{ channel_id: 'c1', name: 'ops', source: 'db' },
	]),
}));

jest.mock('mongoose', () => ({
	connection: {
		db: {
			collection: jest.fn(() => ({
				findOne: jest.fn().mockResolvedValue({ name: 'Guild One' }),
			})),
		},
	},
}));

const { cleanupGuildData } = require('../../utils/guildCleanup');
const {
	leaveGuildRest,
	sendChannelMessage,
	fetchGuild,
	fetchGuildChannels,
} = require('../../utils/discordRest');
const { addBlockedGuilds, removeBlockedGuilds, getEnvBlockedGuildIds } = require('../../utils/blockedGuilds');
const {
	leaveGuilds,
	blacklistGuilds,
	unblacklistGuilds,
	broadcastToGuilds,
} = require('../../utils/guildAdminActions');

describe('guildAdminActions', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		leaveGuildRest.mockResolvedValue({ ok: true, status: 204 });
		getEnvBlockedGuildIds.mockReturnValue(new Set());
	});

	it('leaveGuilds cleans up and leaves via REST', async () => {
		const { results } = await leaveGuilds(['g1']);
		expect(cleanupGuildData).toHaveBeenCalledWith('g1', expect.objectContaining({
			reason: 'dashboard_leave',
			markLeftAt: true,
		}));
		expect(leaveGuildRest).toHaveBeenCalledWith('g1');
		expect(results[0]).toMatchObject({ guild_id: 'g1', status: 'ok' });
	});

	it('blacklistGuilds adds mongo then leaves', async () => {
		const { results } = await blacklistGuilds(['g1'], { by: 'admin' });
		expect(addBlockedGuilds).toHaveBeenCalledWith(['g1'], expect.objectContaining({
			reason: 'dashboard_blacklist',
			by: 'admin',
		}));
		expect(results[0].status).toBe('ok');
		expect(results[0].detail).toContain('blacklisted');
	});

	it('unblacklistGuilds maps remove results', async () => {
		removeBlockedGuilds.mockResolvedValueOnce({
			removed: [],
			skipped_env: ['env-1'],
			missing: [],
		});
		getEnvBlockedGuildIds.mockReturnValue(new Set(['env-1']));
		const { results } = await unblacklistGuilds(['env-1']);
		expect(results[0]).toMatchObject({
			guild_id: 'env-1',
			status: 'skip',
			detail: expect.stringContaining('env'),
		});
	});

	it('broadcastToGuilds dry-run reports candidates', async () => {
		fetchGuild.mockResolvedValue({
			ok: true,
			data: { system_channel_id: null },
		});
		fetchGuildChannels.mockResolvedValue({
			ok: true,
			data: [{ id: 'c1', name: 'ops', type: 0 }],
		});
		const { results, dry_run } = await broadcastToGuilds(['g1'], 'hello', { dry_run: true });
		expect(dry_run).toBe(true);
		expect(sendChannelMessage).not.toHaveBeenCalled();
		expect(results[0].status).toBe('ok');
		expect(results[0].detail).toContain('dry-run');
	});

	it('broadcastToGuilds sends to first working channel', async () => {
		fetchGuild.mockResolvedValue({ ok: true, data: {} });
		fetchGuildChannels.mockResolvedValue({ ok: true, data: [] });
		sendChannelMessage.mockResolvedValue({ ok: true, status: 200 });
		const { results } = await broadcastToGuilds(['g1'], 'hello world');
		expect(sendChannelMessage).toHaveBeenCalledWith('c1', 'hello world');
		expect(results[0]).toMatchObject({ status: 'ok' });
	});

	it('rejects empty guild list and empty message', async () => {
		await expect(leaveGuilds([])).rejects.toMatchObject({ code: 'GUILD_IDS_EMPTY' });
		await expect(broadcastToGuilds(['g1'], '  ')).rejects.toMatchObject({ code: 'GUILD_MSG_EMPTY' });
	});
});
