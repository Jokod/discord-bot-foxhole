import type { ContactGuild, ContactPerson } from '@/types';

export function guildRecencyMs(g: Pick<ContactGuild, 'active' | 'left_at' | 'last_command_at'>) {
	if (!g.active && g.left_at) {
		const t = new Date(g.left_at).getTime();
		return Number.isFinite(t) ? t : 0;
	}
	if (g.last_command_at) {
		const t = new Date(g.last_command_at).getTime();
		return Number.isFinite(t) ? t : 0;
	}
	return 0;
}

export function sortGuildsByRecency(guilds: ContactGuild[]) {
	return [...guilds].sort((a, b) => {
		const activeDiff = Number(b.active) - Number(a.active);
		if (activeDiff) return activeDiff;
		return guildRecencyMs(b) - guildRecencyMs(a);
	});
}

export function sortPeopleByRecency(people: ContactPerson[]) {
	return [...people].sort((a, b) => (b.last_active_at || 0) - (a.last_active_at || 0)
		|| String(a.display_name || a.username || '').localeCompare(String(b.display_name || b.username || '')));
}
