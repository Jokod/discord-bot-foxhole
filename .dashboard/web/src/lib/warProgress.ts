const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;
const MIN_MS = 60 * 1000;
const SEC_MS = 1000;

function splitDuration(ms: number) {
	const totalMs = Math.max(0, Number(ms) || 0);
	const days = Math.floor(totalMs / DAY_MS);
	const hours = Math.floor((totalMs % DAY_MS) / HOUR_MS);
	const minutes = Math.floor((totalMs % HOUR_MS) / MIN_MS);
	const seconds = Math.floor((totalMs % MIN_MS) / SEC_MS);
	return { days, hours, minutes, seconds, totalMs };
}

export function interpolateWarProgress(conquestStartTime: number | null | undefined, conquestEndTime: number | null | undefined, now = Date.now()) {
	if (!conquestStartTime || !Number.isFinite(Number(conquestStartTime))) {
		return { elapsedMs: null, dayOfWar: null, days: null, hours: null, minutes: null, seconds: null, ended: false };
	}
	const start = Number(conquestStartTime);
	const end = conquestEndTime && Number.isFinite(Number(conquestEndTime)) ? Number(conquestEndTime) : null;
	const ended = end != null && end > 0 && now >= end;
	const until = ended ? end : now;
	const elapsedMs = Math.max(0, until - start);
	const parts = splitDuration(elapsedMs);
	return {
		elapsedMs,
		dayOfWar: parts.days + 1,
		days: parts.days,
		hours: parts.hours,
		minutes: parts.minutes,
		seconds: parts.seconds,
		ended,
	};
}

export function remainingUntil(targetMs: number | null | undefined, now = Date.now()) {
	if (!targetMs || !Number.isFinite(Number(targetMs))) {
		return { days: null, hours: null, minutes: null, seconds: null, totalMs: null, expired: true };
	}
	const target = Number(targetMs);
	const totalMs = Math.max(0, target - now);
	const parts = splitDuration(totalMs);
	return { ...parts, expired: totalMs <= 0 };
}

export function formatDurationParts(parts: { days?: number | null; hours?: number | null; minutes?: number | null; seconds?: number | null } | null) {
	if (!parts || parts.days == null) return { d: '—', h: '—', m: '—', s: '—' };
	return {
		d: String(parts.days),
		h: String(parts.hours ?? 0).padStart(2, '0'),
		m: String(parts.minutes ?? 0).padStart(2, '0'),
		s: String(parts.seconds ?? 0).padStart(2, '0'),
	};
}
