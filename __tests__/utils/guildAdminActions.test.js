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
	listRestCandidateChannels: jest.fn(),
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
const { listRestCandidateChannels } = require('../../utils/announceChannels');
const { addBlockedGuilds, removeBlockedGuilds, getEnvBlockedGuildIds } = require('../../utils/blockedGuilds');
const {
	assertGuildLimit,
	MAX_GUILDS_PER_REQUEST,
	normalizeGuildIds,
	leaveGuild,
	leaveGuilds,
	blacklistGuilds,
	unblacklistGuilds,
	broadcastToGuilds,
	broadcastFailDetail,
} = require('../../utils/guildAdminActions');

describe('guildAdminActions', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		leaveGuildRest.mockResolvedValue({ ok: true, status: 204 });
		getEnvBlockedGuildIds.mockReturnValue(new Set());
		listRestCandidateChannels.mockReturnValue([
			{ channel_id: 'c1', name: 'ops', source: 'db' },
		]);
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

	it('unblacklistGuilds détaille removed+env, removed, missing', async () => {
		removeBlockedGuilds.mockResolvedValueOnce({
			removed: ['g-ok', 'g-env'],
			skipped_env: ['g-env-only'],
			missing: ['g-miss'],
		});
		getEnvBlockedGuildIds.mockReturnValue(new Set(['g-env']));

		const { results } = await unblacklistGuilds(['g-ok', 'g-env', 'g-env-only', 'g-miss', 'g-other']);

		expect(results).toEqual([
			{ guild_id: 'g-ok', status: 'ok', detail: 'unblacklisted' },
			{ guild_id: 'g-env', status: 'ok', detail: 'removed from mongo; still blocked via env' },
			{
				guild_id: 'g-env-only',
				status: 'skip',
				detail: 'blocked via env only (not removable)',
			},
			{ guild_id: 'g-miss', status: 'skip', detail: 'not blacklisted' },
			{ guild_id: 'g-other', status: 'skip', detail: 'unchanged' },
		]);
	});

	it('assertGuildLimit rejette trop de guild ids', () => {
		const ids = Array.from({ length: MAX_GUILDS_PER_REQUEST + 1 }, (_, i) => String(i));
		expect(() => assertGuildLimit(ids)).toThrow(/Too many guilds/);
		try {
			assertGuildLimit(ids);
		}
		catch (err) {
			expect(err.code).toBe('GUILD_IDS_MAX');
			expect(err.params).toEqual({ max: MAX_GUILDS_PER_REQUEST });
		}
	});

	it('leaveGuilds fail si cleanup throw', async () => {
		cleanupGuildData.mockRejectedValueOnce(new Error('mongo fail'));
		const { results } = await leaveGuilds(['g1']);
		expect(results[0]).toMatchObject({
			guild_id: 'g1',
			status: 'fail',
			detail: 'cleanup: mongo fail',
		});
		expect(leaveGuildRest).not.toHaveBeenCalled();
	});

	it('normalizeGuildIds déduplique et filtre', () => {
		expect(normalizeGuildIds('bad')).toEqual([]);
		expect(normalizeGuildIds([' g1 ', 'g1', '', 'g2'])).toEqual(['g1', 'g2']);
	});

	it('leaveGuilds ok si leave REST 404', async () => {
		leaveGuildRest.mockResolvedValueOnce({ ok: false, status: 404, error: 'gone' });
		const { results } = await leaveGuilds(['g1']);
		expect(results[0]).toMatchObject({
			status: 'ok',
			detail: 'already left / not in guild',
		});
	});

	it('leaveGuilds fail si leave REST non-404', async () => {
		leaveGuildRest.mockResolvedValueOnce({ ok: false, status: 500, error: 'boom' });
		const { results } = await leaveGuilds(['g1']);
		expect(results[0]).toMatchObject({
			guild_id: 'g1',
			status: 'fail',
			detail: 'leave HTTP 500: boom',
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

	it('broadcastToGuilds rejette un message trop long', async () => {
		const long = 'x'.repeat(2001);
		await expect(broadcastToGuilds(['g1'], long)).rejects.toMatchObject({ code: 'GUILD_MSG_LONG' });
	});

	it('broadcastToGuilds skip bot absent du guild', async () => {
		fetchGuild.mockResolvedValueOnce({ ok: false, status: 404 });
		const { results } = await broadcastToGuilds(['g1'], 'hello');
		expect(results[0]).toMatchObject({ status: 'skip', detail: 'bot not in guild' });
	});

	it('broadcastToGuilds skip si channels HTTP fail', async () => {
		fetchGuild.mockResolvedValueOnce({ ok: true, data: {} });
		fetchGuildChannels.mockResolvedValueOnce({ ok: false, status: 503 });
		const { results } = await broadcastToGuilds(['g1'], 'hello');
		expect(results[0]).toMatchObject({ status: 'skip', detail: 'channels HTTP 503' });
	});

	it('broadcastToGuilds skip sans candidats', async () => {
		fetchGuild.mockResolvedValueOnce({ ok: true, data: {} });
		fetchGuildChannels.mockResolvedValueOnce({ ok: true, data: [] });
		listRestCandidateChannels.mockReturnValueOnce([]);
		const { results } = await broadcastToGuilds(['g1'], 'hello');
		expect(results[0]).toMatchObject({ status: 'skip', detail: 'no sendable channel' });
	});

	it('broadcastToGuilds skip guild HTTP non-404', async () => {
		fetchGuild.mockResolvedValueOnce({ ok: false, status: 503 });
		const { results } = await broadcastToGuilds(['g1'], 'hello');
		expect(results[0]).toMatchObject({ status: 'skip', detail: 'guild HTTP 503' });
	});

	it('broadcastToGuilds skip si channels data non array', async () => {
		fetchGuild.mockResolvedValueOnce({ ok: true, data: {} });
		fetchGuildChannels.mockResolvedValueOnce({ ok: true, data: null });
		const { results } = await broadcastToGuilds(['g1'], 'hello');
		expect(results[0]).toMatchObject({ status: 'skip', detail: 'channels HTTP ?' });
	});

	it('broadcastToGuilds fail si tous les envois échouent', async () => {
		fetchGuild.mockResolvedValueOnce({ ok: true, data: {} });
		fetchGuildChannels.mockResolvedValueOnce({ ok: true, data: [{ id: 'c1', type: 0 }] });
		listRestCandidateChannels.mockReturnValueOnce([
			{ channel_id: 'c1', name: 'ops', source: 'db' },
			{ channel_id: 'c2', name: 'gen', source: 'first-text' },
		]);
		sendChannelMessage
			.mockResolvedValueOnce({ ok: false, status: 403, error: 'forbidden' })
			.mockResolvedValueOnce({ ok: false, status: 500, error: 'down' });
		const { results } = await broadcastToGuilds(['g1'], 'hello');
		expect(results[0]).toMatchObject({
			status: 'fail',
			detail: 'HTTP 500: down',
		});
		expect(sendChannelMessage).toHaveBeenCalledTimes(2);
	});

	it('resolveGuildName retourne null sans db', async () => {
		const mongoose = require('mongoose');
		const saved = mongoose.connection.db;
		mongoose.connection.db = null;
		leaveGuildRest.mockResolvedValue({ ok: true, status: 204 });
		const { results } = await leaveGuilds(['g9']);
		expect(results[0].name).toBeNull();
		mongoose.connection.db = saved;
	});

	it('leaveGuilds fail si cleanup throw', async () => {
		cleanupGuildData.mockRejectedValueOnce(new Error('cleanup fail'));
		const { results } = await leaveGuilds(['g1']);
		expect(results[0]).toMatchObject({ status: 'fail', detail: 'cleanup: cleanup fail' });
	});

	it('leaveGuilds fail si leave REST non-404', async () => {
		leaveGuildRest.mockResolvedValueOnce({ ok: false, status: 503, error: 'down' });
		const { results } = await leaveGuilds(['g1']);
		expect(results[0]).toMatchObject({ status: 'fail', detail: 'leave HTTP 503: down' });
	});

	it('leaveGuilds ok avec detail already left sur 404', async () => {
		leaveGuildRest.mockResolvedValueOnce({ ok: false, status: 404 });
		const { results } = await leaveGuilds(['g1']);
		expect(results[0]).toMatchObject({ status: 'ok', detail: 'already left / not in guild' });
	});

	it('resolveGuildName retourne null si stats sans name', async () => {
		const mongoose = require('mongoose');
		mongoose.connection.db.collection.mockReturnValueOnce({
			findOne: jest.fn().mockResolvedValue({ guild_id: 'g1' }),
		});
		leaveGuildRest.mockResolvedValue({ ok: true, status: 204 });
		const { results } = await leaveGuilds(['g1']);
		expect(results[0].name).toBeNull();
	});

	it('leaveGuilds fail cleanup sans message Error', async () => {
		cleanupGuildData.mockRejectedValueOnce('plain fail');
		const { results } = await leaveGuilds(['g1']);
		expect(results[0]).toMatchObject({
			status: 'fail',
			detail: 'cleanup: plain fail',
		});
	});

	it('leaveGuild avec un seul argument utilise options par défaut', async () => {
		const result = await leaveGuild('g1');
		expect(cleanupGuildData).toHaveBeenCalledWith('g1', expect.objectContaining({
			reason: 'dashboard_leave',
		}));
		expect(result).toMatchObject({ guild_id: 'g1', status: 'ok' });
	});

	it('leaveGuild accepte reason personnalisée', async () => {
		await leaveGuild('g1', { reason: 'manual_leave' });
		expect(cleanupGuildData).toHaveBeenCalledWith('g1', expect.objectContaining({
			reason: 'manual_leave',
		}));
	});

	it('leaveGuilds utilise reason par défaut dashboard_leave', async () => {
		await leaveGuilds(['g1']);
		expect(cleanupGuildData).toHaveBeenCalledWith('g1', expect.objectContaining({
			reason: 'dashboard_leave',
		}));
	});

	it('leaveGuilds fail leave sans error utilise failed', async () => {
		leaveGuildRest.mockResolvedValueOnce({ ok: false, status: 500 });
		const { results } = await leaveGuilds(['g1']);
		expect(results[0].detail).toBe('leave HTTP 500: failed');
	});

	it('blacklistGuilds conserve detail si leave échoue', async () => {
		cleanupGuildData.mockRejectedValueOnce(new Error('blocked cleanup'));
		const { results } = await blacklistGuilds(['g1']);
		expect(results[0]).toMatchObject({
			status: 'fail',
			detail: 'cleanup: blocked cleanup',
		});
		expect(results[0].detail).not.toContain('blacklisted');
	});

	it('broadcastToGuilds fail sans error sur dernier envoi', async () => {
		fetchGuild.mockResolvedValueOnce({ ok: true, data: {} });
		fetchGuildChannels.mockResolvedValueOnce({ ok: true, data: [{ id: 'c1', type: 0 }] });
		listRestCandidateChannels.mockReturnValueOnce([
			{ channel_id: 'c1', name: 'ops', source: 'db' },
		]);
		sendChannelMessage.mockResolvedValueOnce({ ok: false, status: 403 });
		const { results } = await broadcastToGuilds(['g1'], 'hello');
		expect(results[0]).toMatchObject({
			status: 'fail',
			detail: 'HTTP 403: failed',
		});
	});

	it('leaveGuilds utilise guildId comme guildName si resolve name null', async () => {
		const mongoose = require('mongoose');
		mongoose.connection.db.collection.mockReturnValueOnce({
			findOne: jest.fn().mockResolvedValue(null),
		});
		await leaveGuilds(['g-nameless']);
		expect(cleanupGuildData).toHaveBeenCalledWith('g-nameless', expect.objectContaining({
			guildName: 'g-nameless',
		}));
	});

	it('broadcastToGuilds rejette message undefined', async () => {
		await expect(broadcastToGuilds(['g1'], undefined)).rejects.toMatchObject({ code: 'GUILD_MSG_EMPTY' });
	});

	it('broadcastFailDetail utilise le fallback si lastErr absent', () => {
		expect(broadcastFailDetail(null)).toBe('all channels rejected');
		expect(broadcastFailDetail('HTTP 403: failed')).toBe('HTTP 403: failed');
	});
});
