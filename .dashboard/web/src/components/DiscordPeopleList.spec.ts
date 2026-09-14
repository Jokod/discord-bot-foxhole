import { describe, expect, it } from 'vitest';
import DiscordPeopleList from './DiscordPeopleList.vue';
import { mountWithPlugins } from '@/test/mount';
import type { ContactPerson } from '@/types';

const person: ContactPerson = {
	user_id: 'p1',
	display_name: 'Jordan',
	username: 'jordan',
	profile_url: '#',
	roles: ['owner', 'creator'],
	guilds: [
		{ guild_id: 'g1', name: 'Server One', role: 'owner', active: true },
		{ guild_id: 'g2', name: 'Server Two', role: 'creator', active: false },
	],
};

describe('DiscordPeopleList', () => {
	it('affiche person, roles et chips guilds', () => {
		const { wrapper } = mountWithPlugins(DiscordPeopleList, { props: { people: [person] } });
		expect(wrapper.text()).toContain('Jordan');
		expect(wrapper.findAll('.contact-roles .badge')).toHaveLength(2);
		const chips = wrapper.findAll('.chip');
		expect(chips).toHaveLength(2);
		expect(chips[1].classes()).toContain('muted');
	});

	it('sans roles ni guilds', () => {
		const { wrapper } = mountWithPlugins(DiscordPeopleList, {
			props: { people: [{ user_id: 'x', display_name: 'Solo', profile_url: '#' }] },
		});
		expect(wrapper.find('.contact-roles').exists()).toBe(false);
		expect(wrapper.find('.chips').exists()).toBe(false);
	});
});
