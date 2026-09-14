import { formatDurationParts, interpolateWarProgress, remainingUntil } from '@/lib/warProgress';
import type { WarData } from '@/types';

export function computeWarTimers(war: WarData, now = Date.now()) {
	const progress = war.conquestStartTime
		? interpolateWarProgress(war.conquestStartTime, war.conquestEndTime, now)
		: null;
	let ended = Boolean(war.ended);
	if (progress?.ended || (war.winner && war.winner !== 'NONE')) ended = true;

	const elapsed = progress && progress.days != null ? progress : (war.elapsed || null);
	let remaining: ReturnType<typeof remainingUntil> | null = null;
	if (!ended && war.scheduledConquestEndTime) {
		remaining = remainingUntil(war.scheduledConquestEndTime, now);
		if (remaining.expired) remaining = null;
	}

	return {
		ended,
		dayOfWar: progress?.dayOfWar ?? war.dayOfWar ?? null,
		elapsed,
		remaining,
		vp: war.effectiveRequiredVictoryTowns ?? war.requiredVictoryTowns ?? null,
	};
}

export function formatLiveDuration(parts: { days?: number | null; hours?: number | null; minutes?: number | null; seconds?: number | null } | null, t: (k: string, p?: Record<string, unknown>) => string) {
	const p = formatDurationParts(parts);
	return t('war.elapsedValue', { d: p.d, h: p.h, m: p.m, s: p.s });
}

export function formatEndsLine(remaining: ReturnType<typeof remainingUntil>, vp: number | null | undefined, t: (k: string, p?: Record<string, unknown>) => string, n: (v: unknown) => string) {
	const time = formatLiveDuration(remaining, t);
	if (vp == null) return time;
	return t('war.endsWithVp', { time, n: n(vp) });
}
