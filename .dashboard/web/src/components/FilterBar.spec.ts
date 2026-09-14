import { describe, expect, it } from 'vitest';
import FilterBar from './FilterBar.vue';
import { mountWithPlugins } from '@/test/mount';

describe('FilterBar', () => {
	it('applique la variante contacts', () => {
		const { wrapper } = mountWithPlugins(FilterBar, {
			props: { variant: 'contacts' },
			slots: { fields: '<input data-test="field" />' },
		});
		expect(wrapper.classes()).toContain('filters-contacts');
		expect(wrapper.find('[data-test="field"]').exists()).toBe(true);
		expect(wrapper.find('.filter-bar-actions').exists()).toBe(false);
	});

	it('rend le slot actions quand présent', () => {
		const { wrapper } = mountWithPlugins(FilterBar, {
			props: { variant: 'materials' },
			slots: {
				fields: '<span>fields</span>',
				actions: '<button type="button">Go</button>',
			},
		});
		expect(wrapper.classes()).toContain('filters-materials');
		expect(wrapper.get('.filter-bar-actions').text()).toContain('Go');
	});

	it('variantes guilds/compact/default', () => {
		expect(mountWithPlugins(FilterBar, { props: { variant: 'guilds' } }).wrapper.classes())
			.toContain('filters-guilds');
		expect(mountWithPlugins(FilterBar, { props: { variant: 'compact' } }).wrapper.classes())
			.toContain('filters-compact');
		expect(mountWithPlugins(FilterBar).wrapper.classes()).toContain('filter-bar');
		expect(mountWithPlugins(FilterBar).wrapper.classes()).not.toContain('filters-contacts');
	});
});
