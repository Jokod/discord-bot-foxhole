'use strict';

const crypto = require('crypto');
const { runWikiSync, isWriteAllowed } = require('../../../scripts/lib/wiki-sync');
const { DEFAULT_MATERIALS_ROOT, DEFAULT_ICONS_DIR } = require('../materials');

const LOG_BUFFER_MAX = 200;
const STATUS_POLL_MIN_MS = 2000;
const JOB_TTL_MS = 60 * 60 * 1000;

const DEFAULT_COOLDOWN_MS = 5 * 60 * 1000;
const DEFAULT_WRITE_COOLDOWN_MS = 15 * 60 * 1000;
const DEFAULT_MAX_RUNS_PER_HOUR = 6;
const HOUR_MS = 60 * 60 * 1000;

function envMs(name, fallback) {
	const raw = process.env[name];
	if (raw == null || raw === '') return fallback;
	const n = Number(raw);
	return Number.isFinite(n) && n >= 0 ? n : fallback;
}

function envInt(name, fallback) {
	const n = envMs(name, fallback);
	return Math.floor(n);
}

function isWikiSyncApiEnabled(env = process.env) {
	return env.DASHBOARD_WIKI_SYNC === '1';
}

function isWikiWriteEnabled(env = process.env) {
	const flag = env.WIKI_SYNC_WRITE;
	return flag === '1' || flag === 'true';
}

class WikiSyncCooldown {
	constructor() {
		this.lastGlobalStart = 0;
		this.lastWriteStart = 0;
		this.runsBySession = new Map();
		this.lastPollBySession = new Map();
	}

	resetForTests() {
		this.lastGlobalStart = 0;
		this.lastWriteStart = 0;
		this.runsBySession.clear();
		this.lastPollBySession.clear();
	}

	checkStart(sessionId, { dryRun, now = Date.now() } = {}) {
		const cooldownMs = envMs('WIKI_SYNC_COOLDOWN_MS', DEFAULT_COOLDOWN_MS);
		const writeCooldownMs = envMs('WIKI_SYNC_WRITE_COOLDOWN_MS', DEFAULT_WRITE_COOLDOWN_MS);
		const maxRuns = envInt('WIKI_SYNC_MAX_RUNS_PER_HOUR', DEFAULT_MAX_RUNS_PER_HOUR);

		if (this.lastGlobalStart && now - this.lastGlobalStart < cooldownMs) {
			return {
				ok: false,
				code: 'WIKI_SYNC_COOLDOWN',
				retry_after_ms: cooldownMs - (now - this.lastGlobalStart),
			};
		}

		if (!dryRun && this.lastWriteStart && now - this.lastWriteStart < writeCooldownMs) {
			return {
				ok: false,
				code: 'WIKI_SYNC_WRITE_COOLDOWN',
				retry_after_ms: writeCooldownMs - (now - this.lastWriteStart),
			};
		}

		const runs = (this.runsBySession.get(sessionId) || []).filter((t) => now - t < HOUR_MS);
		if (runs.length >= maxRuns) {
			const oldest = Math.min(...runs);
			return {
				ok: false,
				code: 'WIKI_SYNC_QUOTA',
				retry_after_ms: HOUR_MS - (now - oldest),
			};
		}

		return { ok: true };
	}

	recordStart(sessionId, { dryRun, now = Date.now() } = {}) {
		this.lastGlobalStart = now;
		if (!dryRun) {
			this.lastWriteStart = now;
		}
		const runs = (this.runsBySession.get(sessionId) || []).filter((t) => now - t < HOUR_MS);
		runs.push(now);
		this.runsBySession.set(sessionId, runs);
	}

	checkPoll(sessionId, now = Date.now()) {
		for (const [sid, at] of this.lastPollBySession) {
			if (now - at > HOUR_MS) this.lastPollBySession.delete(sid);
		}
		const last = this.lastPollBySession.get(sessionId) || 0;
		if (last && now - last < STATUS_POLL_MIN_MS) {
			return {
				ok: false,
				code: 'WIKI_SYNC_POLL_RATE',
				retry_after_ms: STATUS_POLL_MIN_MS - (now - last),
			};
		}
		this.lastPollBySession.set(sessionId, now);
		return { ok: true };
	}
}

class WikiSyncJobStore {
	constructor({ cooldown, runWikiSyncFn = runWikiSync } = {}) {
		this.cooldown = cooldown || new WikiSyncCooldown();
		this.runWikiSyncFn = runWikiSyncFn;
		this.jobs = new Map();
		this.runningJobId = null;
		this.lastJobId = null;
	}

	resetForTests() {
		this.jobs.clear();
		this.runningJobId = null;
		this.lastJobId = null;
		this.cooldown.resetForTests();
	}

	_getSessionId(req, auth) {
		return auth.sessionIdFromReq(req);
	}

	_pruneJobs(now = Date.now()) {
		for (const [id, job] of this.jobs) {
			if (!job.finishedAt) continue;
			const finishedMs = Date.parse(job.finishedAt);
			if (!Number.isFinite(finishedMs) || now - finishedMs > JOB_TTL_MS) {
				this.jobs.delete(id);
				if (this.lastJobId === id) this.lastJobId = null;
			}
		}
	}

	_pushLog(job, line) {
		const msg = String(line || '').replace(/\r?\n/g, ' ').slice(0, 500);
		if (!msg) return;
		job.logs.push({ at: new Date().toISOString(), message: msg });
		if (job.logs.length > LOG_BUFFER_MAX) {
			job.logs.splice(0, job.logs.length - LOG_BUFFER_MAX);
		}
	}

	_onProgress(job, event) {
		job.phase = event.phase || job.phase;
		job.progress = event;
		let msg = '';
		if (event.phase === 'fetch-wikitext' && event.batch != null && event.totalBatches != null) {
			msg = `fetch-wikitext:${event.batch}/${event.totalBatches}`;
		}
		else if (event.message) {
			msg = String(event.message);
		}
		else if (event.phase) {
			msg = String(event.phase);
		}
		if (!msg) return;
		const prev = job.logs[job.logs.length - 1];
		if (prev?.message === msg) return;
		this._pushLog(job, msg);
	}

	_buildReport(result, job) {
		const icons = result?.icons;
		return {
			job_id: job.id,
			mode: job.mode,
			dry_run: job.dryRun,
			started_at: job.startedAt,
			finished_at: job.finishedAt,
			phases: result?.phases || [],
			icons: icons ? {
				downloaded: icons.downloaded || 0,
				failed: icons.failed || 0,
				skipped_existing: icons.skippedExisting || 0,
				missing_pages: icons.missingPages?.length || 0,
				missing_image: icons.missingImage?.length || 0,
			} : null,
		};
	}

	_mapMode(mode) {
		switch (mode) {
		case 'add-missing':
			return { addMissingOnly: true };
		case 'add-missing-sync':
			return { addMissing: true };
		case 'icons':
			return { syncIcons: true };
		case 'sync':
		default:
			return {};
		}
	}

	async startJob(req, auth, body = {}) {
		this._pruneJobs();
		if (!isWikiSyncApiEnabled()) {
			const err = new Error('Wiki sync API disabled');
			err.status = 403;
			err.code = 'WIKI_SYNC_DISABLED';
			throw err;
		}

		const sessionId = this._getSessionId(req, auth);
		if (!sessionId) {
			const err = new Error('Not authenticated');
			err.status = 401;
			err.code = 'error.auth';
			throw err;
		}

		if (this.runningJobId) {
			const err = new Error('Wiki sync already running');
			err.status = 409;
			err.code = 'WIKI_SYNC_BUSY';
			throw err;
		}

		const mode = String(body.mode || 'sync');
		const allowedModes = new Set(['sync', 'add-missing', 'add-missing-sync', 'icons']);
		if (!allowedModes.has(mode)) {
			const err = new Error('Invalid wiki sync mode');
			err.status = 400;
			err.code = 'WIKI_SYNC_MODE';
			throw err;
		}

		const dryRun = body.dry_run !== false;
		if (!dryRun && !isWriteAllowed({ dryRun: false, dashboard: true })) {
			const err = new Error('Wiki sync write disabled');
			err.status = 403;
			err.code = 'WIKI_SYNC_WRITE_DISABLED';
			throw err;
		}

		const cooldownCheck = this.cooldown.checkStart(sessionId, { dryRun });
		if (!cooldownCheck.ok) {
			const err = new Error('Wiki sync cooldown');
			err.status = 429;
			err.code = cooldownCheck.code;
			err.retry_after_ms = cooldownCheck.retry_after_ms;
			throw err;
		}

		const jobId = crypto.randomUUID();
		const job = {
			id: jobId,
			sessionId,
			mode,
			dryRun,
			descOnly: Boolean(body.desc_only),
			forceIcons: Boolean(body.force_icons),
			status: 'running',
			phase: 'queued',
			progress: null,
			logs: [],
			report: null,
			error: null,
			abortRequested: false,
			startedAt: new Date().toISOString(),
			finishedAt: null,
		};

		this.jobs.set(jobId, job);
		this.runningJobId = jobId;
		this.lastJobId = jobId;
		this.cooldown.recordStart(sessionId, { dryRun });

		const modeOpts = this._mapMode(mode);
		const opts = {
			materialsRoot: DEFAULT_MATERIALS_ROOT,
			iconsDir: DEFAULT_ICONS_DIR,
			dryRun,
			descOnly: job.descOnly,
			forceIcons: job.forceIcons,
			dashboard: true,
			...modeOpts,
			log: (msg) => this._pushLog(job, msg),
		};

		void this._runJob(job, opts);

		return { job_id: jobId };
	}

	async _runJob(job, opts) {
		try {
			this._pushLog(job, `started:${job.mode}:${job.dryRun}`);
			const result = await this.runWikiSyncFn({
				...opts,
				shouldAbort: () => job.abortRequested,
				onProgress: (event) => {
					if (job.abortRequested) return;
					this._onProgress(job, event);
				},
			});
			if (job.abortRequested) {
				job.status = 'aborted';
				job.error = { message: 'Aborted by user', code: 'WIKI_SYNC_ABORTED' };
			}
			else {
				job.status = 'completed';
				job.report = this._buildReport(result, job);
			}
		}
		catch (err) {
			if (err.code === 'WIKI_SYNC_ABORTED' || job.abortRequested) {
				job.status = 'aborted';
				job.error = { message: 'Aborted by user', code: 'WIKI_SYNC_ABORTED' };
			}
			else {
				job.status = 'failed';
				job.error = {
					message: err.message || 'Wiki sync failed',
					code: err.code || 'WIKI_SYNC_ERROR',
				};
				this._pushLog(job, `Erreur: ${job.error.message}`);
			}
		}
		finally {
			job.finishedAt = new Date().toISOString();
			this.runningJobId = null;
		}
	}

	getStatus(req, auth, query = {}) {
		this._pruneJobs();
		const sessionId = this._getSessionId(req, auth);
		if (!sessionId) {
			const err = new Error('Not authenticated');
			err.status = 401;
			err.code = 'error.auth';
			throw err;
		}

		const pollCheck = this.cooldown.checkPoll(sessionId);
		if (!pollCheck.ok) {
			const err = new Error('Poll rate limit');
			err.status = 429;
			err.code = pollCheck.code;
			err.retry_after_ms = pollCheck.retry_after_ms;
			throw err;
		}

		const jobId = query.job_id || this.lastJobId;
		if (!jobId) {
			return {
				status: 'idle',
				phase: null,
				progress: null,
				logs: [],
				report: null,
				error: null,
			};
		}

		const job = this.jobs.get(jobId);
		if (!job) {
			const err = new Error('Job not found');
			err.status = 404;
			err.code = 'WIKI_SYNC_JOB_NOT_FOUND';
			throw err;
		}

		if (job.sessionId !== sessionId) {
			const err = new Error('Job access denied');
			err.status = 403;
			err.code = 'WIKI_SYNC_JOB_FORBIDDEN';
			throw err;
		}

		return {
			job_id: job.id,
			status: job.status,
			phase: job.phase,
			progress: job.progress,
			logs: job.logs,
			report: job.report,
			error: job.error,
			dry_run: job.dryRun,
			mode: job.mode,
			started_at: job.startedAt,
			finished_at: job.finishedAt,
		};
	}

	abortJob(req, auth, body = {}) {
		const sessionId = this._getSessionId(req, auth);
		if (!sessionId) {
			const err = new Error('Not authenticated');
			err.status = 401;
			err.code = 'error.auth';
			throw err;
		}

		const jobId = body.job_id || this.runningJobId;
		if (!jobId) {
			const err = new Error('No running job');
			err.status = 404;
			err.code = 'WIKI_SYNC_JOB_NOT_FOUND';
			throw err;
		}

		const job = this.jobs.get(jobId);
		if (!job) {
			const err = new Error('Job not found');
			err.status = 404;
			err.code = 'WIKI_SYNC_JOB_NOT_FOUND';
			throw err;
		}

		if (job.sessionId !== sessionId) {
			const err = new Error('Job access denied');
			err.status = 403;
			err.code = 'WIKI_SYNC_JOB_FORBIDDEN';
			throw err;
		}

		if (job.status !== 'running') {
			return { ok: true, status: job.status };
		}

		job.abortRequested = true;
		this._pushLog(job, 'Annulation demandée…');
		return { ok: true, status: 'aborting' };
	}

	getConfig() {
		return {
			enabled: isWikiSyncApiEnabled(),
			write_enabled: isWikiWriteEnabled(),
			cooldown_ms: envMs('WIKI_SYNC_COOLDOWN_MS', DEFAULT_COOLDOWN_MS),
			write_cooldown_ms: envMs('WIKI_SYNC_WRITE_COOLDOWN_MS', DEFAULT_WRITE_COOLDOWN_MS),
			max_runs_per_hour: envInt('WIKI_SYNC_MAX_RUNS_PER_HOUR', DEFAULT_MAX_RUNS_PER_HOUR),
			poll_min_ms: STATUS_POLL_MIN_MS,
		};
	}
}

const defaultStore = new WikiSyncJobStore();

module.exports = {
	WikiSyncJobStore,
	WikiSyncCooldown,
	LOG_BUFFER_MAX,
	STATUS_POLL_MIN_MS,
	JOB_TTL_MS,
	isWikiSyncApiEnabled,
	isWikiWriteEnabled,
	defaultStore,
};
