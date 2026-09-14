'use strict';

const crypto = require('crypto');
const {
	WikiSyncJobStore,
	WikiSyncCooldown,
	isWikiSyncApiEnabled,
	isWikiWriteEnabled,
	LOG_BUFFER_MAX,
} = require('../../../.dashboard/lib/wiki/sync');

function mockReq(sessionId = 'abc') {
	return { headers: {}, socket: { remoteAddress: '127.0.0.1' } };
}

function mockAuth(sessionId = 'a'.repeat(64)) {
	return {
		sessionIdFromReq: jest.fn(() => sessionId),
	};
}

describe('WikiSyncJobStore', () => {
	let store;
	let runWikiSyncFn;

	beforeEach(() => {
		jest.useFakeTimers();
		process.env.DASHBOARD_WIKI_SYNC = '1';
		delete process.env.WIKI_SYNC_WRITE;
		process.env.WIKI_SYNC_COOLDOWN_MS = '0';
		process.env.WIKI_SYNC_WRITE_COOLDOWN_MS = '0';
		process.env.WIKI_SYNC_MAX_RUNS_PER_HOUR = '100';
		runWikiSyncFn = jest.fn(async (opts) => {
			opts.onProgress?.({ phase: 'start', dryRun: true });
			opts.onProgress?.({ phase: 'fetch-wikitext', batch: 1, totalBatches: 2 });
			opts.onProgress?.({ phase: 'fetch-wikitext', batch: 1, totalBatches: 2 });
			opts.onProgress?.({ message: 'custom message' });
			opts.log?.('line one');
			opts.log?.('');
			opts.onProgress?.({ phase: 'done' });
			return {
				phases: [{ name: 'maintenance' }],
				dryRun: true,
				icons: {
					downloaded: 1,
					failed: 0,
					skippedExisting: 2,
					missingPages: ['a'],
					missingImage: ['b'],
				},
			};
		});
		store = new WikiSyncJobStore({ runWikiSyncFn });
	});

	afterEach(() => {
		store.resetForTests();
		jest.useRealTimers();
		delete process.env.DASHBOARD_WIKI_SYNC;
		delete process.env.WIKI_SYNC_WRITE;
		delete process.env.WIKI_SYNC_COOLDOWN_MS;
		delete process.env.WIKI_SYNC_WRITE_COOLDOWN_MS;
		delete process.env.WIKI_SYNC_MAX_RUNS_PER_HOUR;
	});

	it('startJob returns job_id and completes async', async () => {
		const auth = mockAuth();
		const out = await store.startJob(mockReq(), auth, { mode: 'sync', dry_run: true });
		expect(out.job_id).toMatch(/^[0-9a-f-]{36}$/i);
		await jest.runAllTimersAsync();
		await Promise.resolve();
		const status = store.getStatus(mockReq(), auth, { job_id: out.job_id });
		expect(status.status).toBe('completed');
		expect(status.report.icons.downloaded).toBe(1);
		expect(runWikiSyncFn).toHaveBeenCalled();
	});

	it('refuses second job when busy', async () => {
		const auth = mockAuth();
		runWikiSyncFn.mockImplementation(() => new Promise(() => { void 0; }));
		await store.startJob(mockReq(), auth, { dry_run: true });
		await expect(store.startJob(mockReq(), auth, { dry_run: true }))
			.rejects.toMatchObject({ status: 409, code: 'WIKI_SYNC_BUSY' });
	});

	it('blocks write when WIKI_SYNC_WRITE disabled', async () => {
		expect(isWikiWriteEnabled()).toBe(false);
		const auth = mockAuth();
		await expect(store.startJob(mockReq(), auth, { dry_run: false }))
			.rejects.toMatchObject({ status: 403, code: 'WIKI_SYNC_WRITE_DISABLED' });
	});

	it('getStatus rejects foreign session', async () => {
		const auth = mockAuth('session-a'.padEnd(64, '0'));
		const { job_id } = await store.startJob(mockReq(), auth, { dry_run: true });
		const otherAuth = mockAuth('session-b'.padEnd(64, '0'));
		expect(() => store.getStatus(mockReq(), otherAuth, { job_id }))
			.toThrow(expect.objectContaining({ code: 'WIKI_SYNC_JOB_FORBIDDEN' }));
	});

	it('cooldown returns 429', async () => {
		process.env.WIKI_SYNC_COOLDOWN_MS = '60000';
		const cooldown = new WikiSyncCooldown();
		const auth = mockAuth();
		const local = new WikiSyncJobStore({ cooldown, runWikiSyncFn });
		await local.startJob(mockReq(), auth, { dry_run: true });
		await jest.runAllTimersAsync();
		await expect(local.startJob(mockReq(), auth, { dry_run: true }))
			.rejects.toMatchObject({ status: 429, code: 'WIKI_SYNC_COOLDOWN' });
		local.resetForTests();
	});

	it('rejects disabled API, missing session, and invalid mode', async () => {
		process.env.DASHBOARD_WIKI_SYNC = '0';
		const auth = mockAuth();
		await expect(store.startJob(mockReq(), auth, { dry_run: true }))
			.rejects.toMatchObject({ code: 'WIKI_SYNC_DISABLED' });

		process.env.DASHBOARD_WIKI_SYNC = '1';
		const noSessionAuth = { sessionIdFromReq: jest.fn(() => null) };
		await expect(store.startJob(mockReq(), noSessionAuth, { dry_run: true }))
			.rejects.toMatchObject({ code: 'error.auth' });

		await expect(store.startJob(mockReq(), auth, { mode: 'bad', dry_run: true }))
			.rejects.toMatchObject({ code: 'WIKI_SYNC_MODE' });
	});

	it('supports add-missing, add-missing-sync, and icons modes', async () => {
		const auth = mockAuth();
		for (const mode of ['add-missing', 'add-missing-sync', 'icons']) {
			const { job_id } = await store.startJob(mockReq(), auth, { mode, dry_run: true });
			await jest.runAllTimersAsync();
			expect(store.getStatus(mockReq(), auth, { job_id }).status).toBe('completed');
			store.resetForTests();
		}
	});

	it('write cooldown and hourly quota', async () => {
		process.env.WIKI_SYNC_WRITE = '1';
		process.env.WIKI_SYNC_WRITE_COOLDOWN_MS = '60000';
		const cooldown = new WikiSyncCooldown();
		cooldown.recordStart('sid', { dryRun: false, now: 1000 });
		const writeCheck = cooldown.checkStart('sid', { dryRun: false, now: 2000 });
		expect(writeCheck.ok).toBe(false);
		expect(writeCheck.code).toBe('WIKI_SYNC_WRITE_COOLDOWN');

		process.env.WIKI_SYNC_MAX_RUNS_PER_HOUR = '1';
		const quotaCooldown = new WikiSyncCooldown();
		quotaCooldown.recordStart('sid', { dryRun: true, now: 1000 });
		const quotaCheck = quotaCooldown.checkStart('sid', { dryRun: true, now: 2000 });
		expect(quotaCheck.ok).toBe(false);
		expect(quotaCheck.code).toBe('WIKI_SYNC_QUOTA');
	});

	it('getStatus idle, not found, and poll rate', () => {
		const auth = mockAuth();
		expect(store.getStatus(mockReq(), auth, {})).toMatchObject({
			status: 'idle',
			logs: [],
		});
		store.cooldown.resetForTests();
		expect(() => store.getStatus(mockReq(), auth, { job_id: 'missing' }))
			.toThrow(expect.objectContaining({ code: 'WIKI_SYNC_JOB_NOT_FOUND' }));

		const cooldown = new WikiSyncCooldown();
		const sid = 'sess';
		cooldown.checkPoll(sid, 1000);
		expect(cooldown.checkPoll(sid, 1500).ok).toBe(false);
	});

	it('abortJob paths and completed job noop', async () => {
		const auth = mockAuth();
		const noSession = { sessionIdFromReq: () => null };
		expect(() => store.abortJob(mockReq(), noSession, {}))
			.toThrow(expect.objectContaining({ code: 'error.auth' }));
		expect(() => store.abortJob(mockReq(), auth, {}))
			.toThrow(expect.objectContaining({ code: 'WIKI_SYNC_JOB_NOT_FOUND' }));

		runWikiSyncFn.mockImplementation(() => new Promise(() => { void 0; }));
		const { job_id } = await store.startJob(mockReq(), auth, { dry_run: true });
		expect(store.abortJob(mockReq(), auth, { job_id })).toEqual({ ok: true, status: 'aborting' });

		const otherAuth = mockAuth('other'.padEnd(64, '0'));
		expect(() => store.abortJob(mockReq(), otherAuth, { job_id }))
			.toThrow(expect.objectContaining({ code: 'WIKI_SYNC_JOB_FORBIDDEN' }));
	});

	it('marks job aborted when abort requested during run', async () => {
		const auth = mockAuth();
		runWikiSyncFn.mockImplementation(async (opts) => {
			opts.onProgress?.({ phase: 'running' });
			store.jobs.get(store.runningJobId).abortRequested = true;
			return { phases: [] };
		});
		const { job_id } = await store.startJob(mockReq(), auth, { dry_run: true });
		await jest.runAllTimersAsync();
		const status = store.getStatus(mockReq(), auth, { job_id });
		expect(status.status).toBe('aborted');
		expect(status.error.code).toBe('WIKI_SYNC_ABORTED');
	});

	it('marks job failed with code par défaut', async () => {
		const auth = mockAuth();
		runWikiSyncFn.mockRejectedValueOnce(new Error('sync fail'));
		const { job_id } = await store.startJob(mockReq(), auth, { dry_run: true });
		await jest.runAllTimersAsync();
		const status = store.getStatus(mockReq(), auth, { job_id });
		expect(status.error.code).toBe('WIKI_SYNC_ERROR');
	});

	it('marks job failed when runWikiSync throws', async () => {
		const auth = mockAuth();
		runWikiSyncFn.mockRejectedValueOnce(Object.assign(new Error('sync fail'), { code: 'CUSTOM' }));
		const { job_id } = await store.startJob(mockReq(), auth, { dry_run: true });
		await jest.runAllTimersAsync();
		const status = store.getStatus(mockReq(), auth, { job_id });
		expect(status.status).toBe('failed');
		expect(status.error.code).toBe('CUSTOM');
	});

	it('getConfig and flags', () => {
		process.env.WIKI_SYNC_WRITE = 'true';
		expect(isWikiWriteEnabled()).toBe(true);
		expect(isWikiSyncApiEnabled()).toBe(true);
		expect(store.getConfig()).toMatchObject({
			enabled: true,
			write_enabled: true,
			poll_min_ms: expect.any(Number),
		});
		delete process.env.DASHBOARD_WIKI_SYNC;
		expect(isWikiSyncApiEnabled()).toBe(false);
	});

	it('log buffer trims beyond max', async () => {
		const auth = mockAuth();
		runWikiSyncFn.mockImplementation(async (opts) => {
			for (let i = 0; i < LOG_BUFFER_MAX + 5; i += 1) {
				opts.log?.(`line-${i}`);
			}
			return { phases: [] };
		});
		const { job_id } = await store.startJob(mockReq(), auth, { dry_run: true });
		await jest.runAllTimersAsync();
		const status = store.getStatus(mockReq(), auth, { job_id });
		expect(status.logs.length).toBeLessThanOrEqual(LOG_BUFFER_MAX);
	});

	it('getStatus exige session et limite le polling', () => {
		const auth = mockAuth();
		const noSession = { sessionIdFromReq: () => null };
		expect(() => store.getStatus(mockReq(), noSession, {}))
			.toThrow(expect.objectContaining({ code: 'error.auth' }));

		store.cooldown.resetForTests();
		store.getStatus(mockReq(), auth, {});
		expect(() => store.getStatus(mockReq(), auth, {}))
			.toThrow(expect.objectContaining({ code: 'WIKI_SYNC_POLL_RATE' }));
	});

	it('abortJob exige session et job existant', async () => {
		const auth = mockAuth();
		const noSession = { sessionIdFromReq: () => null };
		expect(() => store.abortJob(mockReq(), noSession, {}))
			.toThrow(expect.objectContaining({ code: 'error.auth' }));
		expect(() => store.abortJob(mockReq(), auth, { job_id: 'missing' }))
			.toThrow(expect.objectContaining({ code: 'WIKI_SYNC_JOB_NOT_FOUND' }));
	});

	it('abort noop when job already finished', async () => {
		const auth = mockAuth();
		const { job_id } = await store.startJob(mockReq(), auth, { dry_run: true });
		await jest.runAllTimersAsync();
		expect(store.abortJob(mockReq(), auth, { job_id })).toEqual({
			ok: true,
			status: 'completed',
		});
	});

	it('abortJob sans body utilise runningJobId', async () => {
		const auth = mockAuth();
		runWikiSyncFn.mockImplementation(() => new Promise(() => { void 0; }));
		const { job_id } = await store.startJob(mockReq(), auth, { dry_run: true });
		expect(store.abortJob(mockReq(), auth)).toEqual({ ok: true, status: 'aborting' });
		expect(store.jobs.get(job_id).abortRequested).toBe(true);
		store.resetForTests();
	});

	it('startJob utilise body par défaut', async () => {
		const auth = mockAuth();
		const { job_id } = await store.startJob(mockReq(), auth);
		expect(job_id).toMatch(/^[0-9a-f-]{36}$/i);
		await jest.runAllTimersAsync();
		store.resetForTests();
	});

	it('getStatus utilise query par défaut', async () => {
		const auth = mockAuth();
		const { job_id } = await store.startJob(mockReq(), auth, { dry_run: true });
		await jest.runAllTimersAsync();
		store.cooldown.resetForTests();
		expect(store.getStatus(mockReq(), auth).job_id).toBe(job_id);
	});
});

describe('WikiSyncCooldown internals', () => {
	const prevCooldown = process.env.WIKI_SYNC_COOLDOWN_MS;
	const prevWriteCooldown = process.env.WIKI_SYNC_WRITE_COOLDOWN_MS;

	afterEach(() => {
		if (prevCooldown === undefined) delete process.env.WIKI_SYNC_COOLDOWN_MS;
		else process.env.WIKI_SYNC_COOLDOWN_MS = prevCooldown;
		if (prevWriteCooldown === undefined) delete process.env.WIKI_SYNC_WRITE_COOLDOWN_MS;
		else process.env.WIKI_SYNC_WRITE_COOLDOWN_MS = prevWriteCooldown;
	});

	it('checkStart ok sans historique et recordStart dryRun', () => {
		process.env.WIKI_SYNC_COOLDOWN_MS = '500';
		process.env.WIKI_SYNC_WRITE_COOLDOWN_MS = '60000';
		const cooldown = new WikiSyncCooldown();
		expect(cooldown.checkStart('sid', { dryRun: true, now: 1000 }).ok).toBe(true);
		cooldown.recordStart('sid', { dryRun: true, now: 1000 });
		expect(cooldown.lastWriteStart).toBe(0);
		// past global cooldown (500ms), write cooldown unused because lastWriteStart stays 0
		expect(cooldown.checkStart('sid', { dryRun: false, now: 2000 }).ok).toBe(true);
	});

	it('recordStart filtre runs expires du meme sessionId', () => {
		const cooldown = new WikiSyncCooldown();
		const old = Date.now() - (60 * 60 * 1000 + 1000);
		cooldown.runsBySession.set('sid', [old, Date.now()]);
		cooldown.recordStart('sid', { dryRun: true, now: Date.now() });
		expect(cooldown.runsBySession.get('sid').length).toBe(2);
		cooldown.resetForTests();
	});

	it('recordStart dryRun ne pose pas write cooldown', () => {
		process.env.WIKI_SYNC_COOLDOWN_MS = '0';
		process.env.WIKI_SYNC_WRITE_COOLDOWN_MS = '60000';
		const cooldown = new WikiSyncCooldown();
		cooldown.recordStart('sid', { dryRun: true, now: 1000 });
		expect(cooldown.lastWriteStart).toBe(0);
		expect(cooldown.checkStart('sid', { dryRun: false, now: 2000 }).ok).toBe(true);
	});
});

describe('WikiSync env helpers', () => {
	beforeEach(() => {
		jest.useFakeTimers();
		process.env.DASHBOARD_WIKI_SYNC = '1';
		process.env.WIKI_SYNC_COOLDOWN_MS = '0';
		process.env.WIKI_SYNC_WRITE_COOLDOWN_MS = '0';
		process.env.WIKI_SYNC_MAX_RUNS_PER_HOUR = '100';
	});

	afterEach(() => {
		jest.useRealTimers();
	});

	it('envMs et envInt utilisent les fallbacks', async () => {
		process.env.WIKI_SYNC_COOLDOWN_MS = 'not-a-number';
		process.env.WIKI_SYNC_MAX_RUNS_PER_HOUR = '-1';
		const store = new WikiSyncJobStore({
			runWikiSyncFn: jest.fn(async () => ({ phases: [] })),
		});
		const cfg = store.getConfig();
		expect(cfg.cooldown_ms).toBeGreaterThan(0);
		expect(cfg.max_runs_per_hour).toBeGreaterThanOrEqual(0);
		store.resetForTests();
	});

	it('_buildReport sans icons et _onProgress phase seule', async () => {
		const auth = mockAuth();
		const runWikiSyncFn = jest.fn(async (opts) => {
			opts.onProgress?.({ phase: 'only-phase' });
			return { phases: [{ name: 'x' }] };
		});
		const local = new WikiSyncJobStore({ runWikiSyncFn });
		process.env.WIKI_SYNC_COOLDOWN_MS = '0';
		const { job_id } = await local.startJob(mockReq(), auth, { dry_run: true });
		await jest.runAllTimersAsync();
		const status = local.getStatus(mockReq(), auth, { job_id });
		expect(status.report.icons).toBeNull();
		local.resetForTests();
	});

	it('getStatus utilise lastJobId par défaut', async () => {
		jest.useFakeTimers();
		process.env.WIKI_SYNC_COOLDOWN_MS = '0';
		const auth = mockAuth();
		const local = new WikiSyncJobStore({
			runWikiSyncFn: jest.fn(async () => ({ phases: [] })),
		});
		const { job_id } = await local.startJob(mockReq(), auth, { dry_run: true });
		await jest.runAllTimersAsync();
		local.cooldown.resetForTests();
		const status = local.getStatus(mockReq(), auth, {});
		expect(status.job_id).toBe(job_id);
		local.resetForTests();
		jest.useRealTimers();
	});

	it('checkStart et recordStart utilisent Date.now par défaut', () => {
		const cooldown = new WikiSyncCooldown();
		expect(cooldown.checkStart('sid').ok).toBe(true);
		cooldown.recordStart('sid');
		expect(cooldown.runsBySession.get('sid')).toHaveLength(1);
		cooldown.resetForTests();
	});

	it('_onProgress ignore events vides et deduplique messages identiques', async () => {
		const auth = mockAuth();
		const runWikiSyncFn = jest.fn(async (opts) => {
			opts.onProgress?.({});
			opts.onProgress?.({ message: 'same' });
			opts.onProgress?.({ message: 'same' });
			return { phases: [] };
		});
		const local = new WikiSyncJobStore({ runWikiSyncFn });
		const { job_id } = await local.startJob(mockReq(), auth, { dry_run: true });
		await jest.runAllTimersAsync();
		const status = local.getStatus(mockReq(), auth, { job_id });
		expect(status.logs.filter((l) => l.message === 'same')).toHaveLength(1);
		local.resetForTests();
	});

	it('getConfig lit variables env numériques', () => {
		process.env.WIKI_SYNC_COOLDOWN_MS = '1234';
		process.env.WIKI_SYNC_WRITE_COOLDOWN_MS = '5678';
		const local = new WikiSyncJobStore({ runWikiSyncFn: jest.fn() });
		expect(local.getConfig()).toMatchObject({
			cooldown_ms: 1234,
			write_cooldown_ms: 5678,
		});
		local.resetForTests();
	});

	it('_buildReport mappe icons partiels et phases par défaut', async () => {
		const auth = mockAuth();
		const runWikiSyncFn = jest.fn(async () => ({
			icons: {
				missingImage: ['img1'],
			},
		}));
		const local = new WikiSyncJobStore({ runWikiSyncFn });
		const { job_id } = await local.startJob(mockReq(), auth, { dry_run: true });
		await jest.runAllTimersAsync();
		const status = local.getStatus(mockReq(), auth, { job_id });
		expect(status.report.phases).toEqual([]);
		expect(status.report.icons).toEqual({
			downloaded: 0,
			failed: 0,
			skipped_existing: 0,
			missing_pages: 0,
			missing_image: 1,
		});
		local.resetForTests();
	});

	it('_buildReport default icons counters sans champs optionnels', async () => {
		const auth = mockAuth();
		const local = new WikiSyncJobStore({
			runWikiSyncFn: jest.fn(async () => ({ icons: {} })),
		});
		const { job_id } = await local.startJob(mockReq(), auth, { dry_run: true });
		await jest.runAllTimersAsync();
		expect(local.getStatus(mockReq(), auth, { job_id }).report.icons).toEqual({
			downloaded: 0,
			failed: 0,
			skipped_existing: 0,
			missing_pages: 0,
			missing_image: 0,
		});
		local.resetForTests();
	});

	it('_runJob ignore onProgress apres abortRequested', async () => {
		const auth = mockAuth();
		const holder = { store: null };
		const runWikiSyncFn = jest.fn(async (opts) => {
			holder.store.jobs.get(holder.store.runningJobId).abortRequested = true;
			opts.onProgress?.({ phase: 'ignored' });
			return { phases: [] };
		});
		holder.store = new WikiSyncJobStore({ runWikiSyncFn });
		const { job_id } = await holder.store.startJob(mockReq(), auth, { dry_run: true });
		await jest.runAllTimersAsync();
		const status = holder.store.getStatus(mockReq(), auth, { job_id });
		expect(status.status).toBe('aborted');
		expect(status.logs.some((l) => l.message === 'ignored')).toBe(false);
		holder.store.resetForTests();
	});

	it('_runJob marque failed avec erreur sans message ni code', async () => {
		const auth = mockAuth();
		const runWikiSyncFn = jest.fn(async () => {
			throw {};
		});
		const local = new WikiSyncJobStore({ runWikiSyncFn });
		const { job_id } = await local.startJob(mockReq(), auth, { dry_run: true });
		await jest.runAllTimersAsync();
		const status = local.getStatus(mockReq(), auth, { job_id });
		expect(status.status).toBe('failed');
		expect(status.error).toEqual({
			message: 'Wiki sync failed',
			code: 'WIKI_SYNC_ERROR',
		});
		local.resetForTests();
	});

	it('_runJob marque aborted quand shouldAbort lève WIKI_SYNC_ABORTED', async () => {
		const auth = mockAuth();
		const runWikiSyncFn = jest.fn(async (opts) => {
			expect(typeof opts.shouldAbort).toBe('function');
			expect(opts.shouldAbort()).toBe(false);
			const err = new Error('aborted');
			err.code = 'WIKI_SYNC_ABORTED';
			throw err;
		});
		const local = new WikiSyncJobStore({ runWikiSyncFn });
		const { job_id } = await local.startJob(mockReq(), auth, { dry_run: true });
		await jest.runAllTimersAsync();
		const status = local.getStatus(mockReq(), auth, { job_id });
		expect(status.status).toBe('aborted');
		expect(status.error.code).toBe('WIKI_SYNC_ABORTED');
		local.resetForTests();
	});

	it('_pruneJobs retire les jobs terminés hors TTL', async () => {
		const auth = mockAuth();
		const runWikiSyncFn = jest.fn(async () => ({ phases: [] }));
		const local = new WikiSyncJobStore({ runWikiSyncFn });
		const { job_id } = await local.startJob(mockReq(), auth, { dry_run: true });
		await jest.runAllTimersAsync();
		const job = local.jobs.get(job_id);
		job.finishedAt = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
		local.lastJobId = job_id;
		local._pruneJobs();
		expect(local.jobs.has(job_id)).toBe(false);
		expect(local.lastJobId).toBeNull();

		local.jobs.set('running', {
			id: 'running',
			finishedAt: null,
			status: 'running',
		});
		local.jobs.set('bad-date', {
			id: 'bad-date',
			finishedAt: 'not-a-date',
			status: 'completed',
		});
		local._pruneJobs();
		expect(local.jobs.has('running')).toBe(true);
		expect(local.jobs.has('bad-date')).toBe(false);
		local.resetForTests();
	});

	it('checkPoll purge les sessions trop anciennes', () => {
		const cooldown = new WikiSyncCooldown();
		const HOUR_MS = 60 * 60 * 1000;
		cooldown.lastPollBySession.set('old', 1000);
		cooldown.lastPollBySession.set('fresh', Date.now());
		const check = cooldown.checkPoll('fresh', Date.now() + HOUR_MS + 1);
		expect(check.ok).toBe(true);
		expect(cooldown.lastPollBySession.has('old')).toBe(false);
		cooldown.resetForTests();
	});

});

describe('wiki sync paths', () => {
	it('uses project-root data/materials, not .dashboard/data/materials', () => {
		const fs = require('fs');
		const path = require('path');
		const { DEFAULT_MATERIALS_ROOT, DEFAULT_ICONS_DIR } = require('../../../.dashboard/lib/materials');
		expect(DEFAULT_MATERIALS_ROOT).toBe(path.join(__dirname, '../../../data/materials'));
		expect(DEFAULT_ICONS_DIR).toBe(path.join(__dirname, '../../../assets/icons/materials'));
		expect(fs.existsSync(DEFAULT_MATERIALS_ROOT)).toBe(true);
		expect(DEFAULT_MATERIALS_ROOT).not.toContain(`${path.sep}.dashboard${path.sep}data${path.sep}materials`);
	});
});
