import { describe, expect, it } from 'vitest';
import ContactPerson from './ContactPerson.vue';
import { mountWithPlugins } from '@/test/mount';

describe('ContactPerson', () => {
	it('affiche un tiret sans user_id', () => {
		const { wrapper } = mountWithPlugins(ContactPerson, { props: { user: null } });
		expect(wrapper.text()).toBe('—');
	});

	it('affiche avatar, nom et username', () => {
		const { wrapper } = mountWithPlugins(ContactPerson, {
			props: {
				user: {
					user_id: '1',
					display_name: 'Fox',
					username: 'fox',
					avatar_url: 'https://cdn.example/a.png',
					profile_url: 'https://discord.com/users/1',
				},
				compact: true,
			},
		});
		expect(wrapper.classes()).toContain('compact');
		expect(wrapper.get('img').attributes('src')).toBe('https://cdn.example/a.png');
		expect(wrapper.get('a').text()).toBe('Fox');
		expect(wrapper.get('a').attributes('href')).toBe('https://discord.com/users/1');
		expect(wrapper.text()).toContain('@fox');
	});

	it('fallback user_id si pas de display_name', () => {
		const { wrapper } = mountWithPlugins(ContactPerson, {
			props: { user: { user_id: '99', profile_url: '#' } },
		});
		expect(wrapper.get('a').text()).toBe('99');
		expect(wrapper.find('img').exists()).toBe(false);
	});
});
