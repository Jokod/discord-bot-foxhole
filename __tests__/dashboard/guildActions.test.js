'use strict';

jest.mock('../../utils/guildAdminActions', () => ({
	leaveGuilds: jest.fn().mockResolvedValue({ results: [{ guild_id: 'g1', status: 'ok' }] }),
	blacklistGuilds: jest.fn().mockResolvedValue({ results: [{ guild_id: 'g1', status: 'ok' }] }),
	unblacklistGuilds: jest.fn().mockResolvedValue({ results: [{ guild_id: 'g1', status: 'ok' }] }),
	broadcastToGuilds: jest.fn().mockResolvedValue({ results: [{ guild_id: 'g1', status: 'ok' }], dry_run: true }),
	MAX_GUILDS_PER_REQUEST: 25,
	MAX_MESSAGE_LENGTH: 2000,
}));

const {
	leaveGuilds,
	blacklistGuilds,
	unblacklistGuilds,
	broadcastToGuilds,
} = require('../../utils/guildAdminActions');
const {
	handleLeave,
	handleBlacklist,
	handleUnblacklist,
	handleBroadcast,
	MAX_GUILDS_PER_REQUEST,
	MAX_MESSAGE_LENGTH,
} = require('../../.dashboard/lib/guildActions');

describe('dashboard lib/guildActions', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('exposes limits from guildAdminActions', () => {
		expect(MAX_GUILDS_PER_REQUEST).toBe(25);
		expect(MAX_MESSAGE_LENGTH).toBe(2000);
	});

	it('handleLeave forwards guild_ids with dashboard reason', async () => {
		await handleLeave({ guild_ids: ['g1'] });
		expect(leaveGuilds).toHaveBeenCalledWith(['g1'], { reason: 'dashboard_leave' });
	});

	it('handleBlacklist passes username as by', async () => {
		await handleBlacklist({ guild_ids: ['g1'] }, 'admin');
		expect(blacklistGuilds).toHaveBeenCalledWith(['g1'], { by: 'admin' });
		await handleBlacklist({ guild_ids: ['g1'] });
		expect(blacklistGuilds).toHaveBeenCalledWith(['g1'], { by: null });
	});

	it('handleUnblacklist forwards ids', async () => {
		await handleUnblacklist({ guild_ids: ['g1', 'g2'] });
		expect(unblacklistGuilds).toHaveBeenCalledWith(['g1', 'g2']);
	});

	it('handleBroadcast forwards message and dry_run', async () => {
		await handleBroadcast({ guild_ids: ['g1'], message: 'hi', dry_run: 1 });
		expect(broadcastToGuilds).toHaveBeenCalledWith(['g1'], 'hi', { dry_run: true });
		await handleBroadcast({ guild_ids: ['g1'], message: 'hi' });
		expect(broadcastToGuilds).toHaveBeenCalledWith(['g1'], 'hi', { dry_run: false });
	});
});
