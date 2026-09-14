import { describe, expect, it } from 'vitest';
import EmptyState from './EmptyState.vue';
import { mountWithPlugins } from '@/test/mount';

describe('EmptyState', () => {
	it('affiche le message par défaut', () => {
		const { wrapper } = mountWithPlugins(EmptyState, { props: { message: 'Nothing here' } });
		expect(wrapper.text()).toContain('Nothing here');
		expect(wrapper.classes()).toContain('empty-state');
	});

	it('préfère le slot au message', () => {
		const { wrapper } = mountWithPlugins(EmptyState, {
			props: { message: 'fallback' },
			slots: { default: 'Custom empty' },
		});
		expect(wrapper.text()).toContain('Custom empty');
		expect(wrapper.text()).not.toContain('fallback');
	});
});
