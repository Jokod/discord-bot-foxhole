const PHASE_SLUGS = new Set([
	'queued',
	'start',
	'maintenance',
	'add-missing',
	'descriptions-factions',
	'icons',
	'fetch-wikitext',
	'scan-category',
	'done',
	'completed',
	'failed',
	'aborted',
]);

type Progress = Record<string, unknown> | null | undefined;
type TFn = (key: string, params?: Record<string, unknown>) => string;

function translatePhaseKey(t: TFn, phase: string, progress?: Progress): string {
	if (phase === 'fetch-wikitext') {
		const batch = progress?.batch;
		const total = progress?.totalBatches;
		if (batch != null && total != null) {
			return t('materials.wikiSync.phase.fetch-wikitextBatch', {
				batch: String(batch),
				total: String(total),
			});
		}
	}

	if (phase === 'scan-category' && progress?.category) {
		const category = String(progress.category).replace(/^Category:/i, '').trim();
		return t('materials.wikiSync.phase.scan-category', { category });
	}

	const key = `materials.wikiSync.phase.${phase}`;
	const translated = t(key);
	return translated === key ? phase : translated;
}

export function wikiSyncPhaseLabel(
	t: TFn,
	phase?: string | null,
	progress?: Progress,
): string {
	if (!phase || phase === 'running') return '';
	return translatePhaseKey(t, phase, progress);
}

export function wikiSyncLogLine(t: TFn, message: string, progress?: Progress): string {
	const trimmed = message.trim();

	if (trimmed.startsWith('started:')) {
		const [, mode = 'sync', dryRun = 'true'] = trimmed.split(':');
		return t('materials.wikiSync.log.started', {
			mode,
			dryRun: dryRun === 'true' ? t('yes') : t('no'),
		});
	}

	const batchMatch = trimmed.match(/^fetch-wikitext:(\d+)\/(\d+)$/);
	if (batchMatch) {
		return t('materials.wikiSync.phase.fetch-wikitextBatch', {
			batch: batchMatch[1],
			total: batchMatch[2],
		});
	}

	if (PHASE_SLUGS.has(trimmed)) {
		return translatePhaseKey(t, trimmed, progress);
	}

	const legacyStart = trimmed.match(/^Démarrage mode=(\S+) dry_run=(true|false)$/);
	if (legacyStart) {
		return t('materials.wikiSync.log.started', {
			mode: legacyStart[1],
			dryRun: legacyStart[2] === 'true' ? t('yes') : t('no'),
		});
	}

	return message;
}

export function formatWikiSyncLogs(
	t: TFn,
	logs: { message: string }[] | undefined,
	progress?: Progress,
): string {
	const lines: string[] = [];
	let last = '';
	for (const entry of logs || []) {
		const line = wikiSyncLogLine(t, entry.message, progress);
		if (!line || line === last) continue;
		lines.push(line);
		last = line;
	}
	return lines.join('\n');
}
