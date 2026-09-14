import { describe, expect, it } from 'vitest';
import LoadingState from './LoadingState.vue';
import { mountWithPlugins } from '@/test/mount';

describe('LoadingState', () => {
	it('rend un status avec aria-label i18n', () => {
		const { wrapper } = mountWithPlugins(LoadingState);
		const root = wrapper.get('[role="status"]');
		expect(root.classes()).toContain('loading-state');
		expect(root.attributes('aria-label')).toBeTruthy();
		expect(wrapper.find('.loading-msg').exists()).toBe(false);
	});

	it('affiche le message et les classes inline/overlay', () => {
		const { wrapper } = mountWithPlugins(LoadingState, {
			props: { message: 'Please wait', inline: true, overlay: true },
		});
		expect(wrapper.classes()).toContain('inline');
		expect(wrapper.classes()).toContain('overlay');
		expect(wrapper.get('.loading-msg').text()).toBe('Please wait');
		expect(wrapper.attributes('aria-label')).toBe('Please wait');
	});
});
