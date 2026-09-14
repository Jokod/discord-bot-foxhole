import { describe, expect, it } from 'vitest';
import MaterialDrawerBody from './MaterialDrawerBody.vue';
import { mountWithPlugins } from '@/test/mount';
import type { MaterialItem } from '@/types';

const item: MaterialItem = {
	itemName: 'Rifle',
	itemDesc: 'A basic rifle',
	category: 'Small Arms',
	subcategory: 'Rifles',
	iconUrl: '/icons/rifle.png',
	wikiUrl: 'https://foxhole.wiki.gg/wiki/Rifle',
};

describe('MaterialDrawerBody', () => {
	it('affiche icône, description et lien wiki', () => {
		const { wrapper } = mountWithPlugins(MaterialDrawerBody, { props: { item } });
		expect(wrapper.get('h3').text()).toBe('Rifle');
		expect(wrapper.get('.mat-drawer-desc').text()).toBe('A basic rifle');
		expect(wrapper.get('img').attributes('src')).toBe('/icons/rifle.png');
		expect(wrapper.get('a').attributes('href')).toBe(item.wikiUrl);
	});

	it('sans icône', () => {
		const { wrapper } = mountWithPlugins(MaterialDrawerBody, {
			props: { item: { ...item, iconUrl: undefined } },
		});
		expect(wrapper.find('img').exists()).toBe(false);
	});
});
