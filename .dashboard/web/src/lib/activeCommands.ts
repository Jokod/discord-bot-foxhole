import type { NamedCount } from '@/types';

const STALE_MS = 90 * 24 * 60 * 60 * 1000;

/** Commands used in the last 90 days, or legacy high-usage entries without timestamps. */
export function filterActiveCommands(commands: NamedCount[], now = Date.now()) {
	if (!commands.length) return [];
	const topTotal = commands[0]?.total || 1;
	return commands.filter((c) => {
		if (c.last_used) {
			const age = now - new Date(c.last_used).getTime();
			return age <= STALE_MS;
		}
		return (c.pct ?? 0) >= 0.5 || c.total >= Math.max(10, topTotal * 0.01);
	});
}

export function hiddenCommandCount(commands: NamedCount[]) {
	return Math.max(0, commands.length - filterActiveCommands(commands).length);
}
