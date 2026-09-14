import { defineStore } from 'pinia';
import { ref } from 'vue';
import { ApiError, api } from '@/api/client';
import type { WikiSyncJob } from '@/types';
import { useMaterialsStore } from './materials';

export const useWikiSyncStore = defineStore('wikiSync', () => {
	const mode = ref('sync');
	const dryRun = ref(true);
	const apply = ref(false);
	const running = ref(false);
	const jobId = ref<string | null>(null);
	const status = ref<WikiSyncJob | null>(null);
	const error = ref<string | null>(null);
	const cooldownUntil = ref(0);
	const cooldownDurationMs = ref(0);
	let pollTimer: ReturnType<typeof setInterval> | null = null;

	const COOLDOWN_CODES = new Set([
		'WIKI_SYNC_COOLDOWN',
		'WIKI_SYNC_WRITE_COOLDOWN',
		'WIKI_SYNC_QUOTA',
	]);

	function applyCooldown(retryAfterMs: number, code?: string) {
		if (code === 'WIKI_SYNC_POLL_RATE') return;
		const ms = Math.max(0, Number(retryAfterMs) || 0);
		if (!ms) return;
		const now = Date.now();
		cooldownDurationMs.value = ms;
		cooldownUntil.value = now + ms;
	}

	function clearCooldown() {
		cooldownUntil.value = 0;
		cooldownDurationMs.value = 0;
	}

	function stopPollTimer() {
		if (pollTimer) clearInterval(pollTimer);
		pollTimer = null;
	}

	function stopPoll() {
		stopPollTimer();
		jobId.value = null;
		running.value = false;
	}

	async function poll() {
		if (!jobId.value) return;
		try {
			const data = await api<WikiSyncJob>(`/api/wiki-sync/status?job_id=${encodeURIComponent(jobId.value)}`);
			status.value = data;
			if (['completed', 'failed', 'aborted'].includes(data.status)) {
				stopPoll();
				if (data.status === 'completed' && !data.dry_run) {
					await useMaterialsStore().load(true);
				}
			}
		}
		catch (err) {
			if (err instanceof ApiError) {
				if (err.status === 401) {
					stopPoll();
					error.value = err.message;
					return;
				}
				if (err.retry_after_ms && err.code && COOLDOWN_CODES.has(err.code)) {
					applyCooldown(err.retry_after_ms, err.code);
				}
				if (err.status !== 429) stopPoll();
				return;
			}
			if (!(err instanceof Error) || (err as { status?: number }).status !== 429) stopPoll();
		}
	}

	async function start(dry: boolean) {
		error.value = null;
		try {
			const out = await api<{ job_id: string }>('/api/wiki-sync', {
				method: 'POST',
				body: JSON.stringify({ mode: mode.value, dry_run: dry, force_icons: false }),
			});
			jobId.value = out.job_id;
			running.value = true;
			clearCooldown();
			status.value = { status: 'running', logs: [] };
			stopPollTimer();
			pollTimer = setInterval(poll, 2500);
			await poll();
		}
		catch (err) {
			if (err instanceof ApiError) {
				if (err.retry_after_ms && err.code && COOLDOWN_CODES.has(err.code)) {
					applyCooldown(err.retry_after_ms, err.code);
					error.value = null;
					return;
				}
				error.value = err.message;
				return;
			}
			error.value = err instanceof Error ? err.message : String(err);
		}
	}

	async function abort() {
		if (!jobId.value) return;
		try {
			await api('/api/wiki-sync/abort', {
				method: 'POST',
				body: JSON.stringify({ job_id: jobId.value }),
			});
		}
		catch {
			// ignore
		}
	}

	return {
		mode, dryRun, apply, running, jobId, status, error, cooldownUntil, cooldownDurationMs,
		start, abort, stopPoll,
	};
});
