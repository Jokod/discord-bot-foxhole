import { describe, expect, it } from 'vitest';
import SectionPanel from './SectionPanel.vue';
import { mountWithPlugins } from '@/test/mount';

describe('SectionPanel', () => {
	it('affiche title, count et slot', () => {
		const { wrapper } = mountWithPlugins(SectionPanel, {
			props: { title: 'Guilds', count: 3, subtitle: 'Active' },
			slots: { default: '<p>content</p>', actions: '<button>More</button>' },
			attrs: { 'data-panel': '1' },
		});
		expect(wrapper.get('h2').text()).toContain('Guilds');
		expect(wrapper.get('h2').text()).toContain('(3)');
		expect(wrapper.get('.sub').text()).toBe('Active');
		expect(wrapper.get('.page-head-actions').text()).toContain('More');
		expect(wrapper.attributes('data-panel')).toBe('1');
	});

	it('sans header si aucun titre/slot', () => {
		const { wrapper } = mountWithPlugins(SectionPanel, {
			slots: { default: '<span>only</span>' },
		});
		expect(wrapper.find('.section-panel-head').exists()).toBe(false);
		expect(wrapper.text()).toContain('only');
	});
});
