import { describe, expect, it } from 'vitest';
import DiscordGuildList from './DiscordGuildList.vue';
import { mountWithPlugins } from '@/test/mount';
import type { ContactGuild } from '@/types';

const guild: ContactGuild = {
	guild_id: 'g1',
	name: 'Alpha',
	active: true,
	member_count: 10,
	command_count: 5,
	lang: 'en',
	activity: '7d',
	last_command_at: new Date().toISOString(),
	joined_at: '2024-01-01T00:00:00.000Z',
	owner: { user_id: 'o1', display_name: 'Owner', profile_url: '#' },
	creators: [
		{ user_id: 'c1', display_name: 'Crea', profile_url: '#', stockpiles: 2, operations: 1 },
	],
};

describe('DiscordGuildList', () => {
	it('rend une carte guild active avec owner et contributors', () => {
		const { wrapper } = mountWithPlugins(DiscordGuildList, { props: { guilds: [guild] } });
		expect(wrapper.get('.discord-card-title strong').text()).toBe('Alpha');
		expect(wrapper.find('.inactive').exists()).toBe(false);
		expect(wrapper.text()).toContain('Owner');
		expect(wrapper.text()).toContain('Crea');
		expect(wrapper.find('.contributor-stats').exists()).toBe(true);
	});

	it('marque inactive et sans contributors', () => {
		const left: ContactGuild = {
			...guild,
			guild_id: 'g2',
			name: 'Left',
			active: false,
			joined_at: undefined,
			creators: [],
		};
		const { wrapper } = mountWithPlugins(DiscordGuildList, { props: { guilds: [left] } });
		expect(wrapper.find('.discord-card').classes()).toContain('inactive');
		expect(wrapper.find('.contributors-list').exists()).toBe(false);
	});
});
