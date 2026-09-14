'use strict';

const crypto = require('crypto');
const { verifyJwt } = require('../../../.dashboard/lib/api/tokens');
const { sanitizePublicGuild } = require('../../../.dashboard/lib/api/public');
const { WikiSyncJobStore } = require('../../../.dashboard/lib/wiki/sync');

const SECRET = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789ab';

describe('dashboard security cases', () => {
	it('JWT alg none rejected', () => {
		const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
		const body = Buffer.from(JSON.stringify({
			jti: crypto.randomUUID(), sub: 'a', scopes: ['materials'], iat: 1, exp: 9999999999,
		})).toString('base64url');
		expect(verifyJwt(`${header}.${body}.`, SECRET).ok).toBe(false);
	});

	it('public guild allowlist excludes owner_id', () => {
		const out = sanitizePublicGuild({
			guild_id: '1',
			name: 'G',
			owner_id: 'secret',
			member_count: 10,
		});
		expect(out.guild_id).toBe('1');
		expect(out.owner_id).toBeUndefined();
	});

	it('wiki sync job ownership enforced', async () => {
		process.env.DASHBOARD_WIKI_SYNC = '1';
		process.env.WIKI_SYNC_COOLDOWN_MS = '0';
		const store = new WikiSyncJobStore({
			runWikiSyncFn: jest.fn(async () => ({ phases: [] })),
		});
		const authA = { sessionIdFromReq: () => 'a'.repeat(64) };
		const authB = { sessionIdFromReq: () => 'b'.repeat(64) };
		const { job_id } = await store.startJob({}, authA, { dry_run: true });
		expect(() => store.getStatus({}, authB, { job_id }))
			.toThrow(expect.objectContaining({ code: 'WIKI_SYNC_JOB_FORBIDDEN' }));
		store.resetForTests();
	});
});
