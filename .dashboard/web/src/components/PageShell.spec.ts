import { describe, expect, it } from 'vitest';
import PageShell from './PageShell.vue';
import { mountWithPlugins } from '@/test/mount';

describe('PageShell', () => {
	it('affiche title et subtitle', () => {
		const { wrapper } = mountWithPlugins(PageShell, {
			props: { title: 'Overview', subtitle: 'Stats' },
			slots: { default: '<p data-test="body">Body</p>' },
		});
		expect(wrapper.get('h1').text()).toBe('Overview');
		expect(wrapper.get('.sub').text()).toBe('Stats');
		expect(wrapper.get('[data-test="body"]').text()).toBe('Body');
	});

	it('affiche subtitleHtml quand pas de subtitle', () => {
		const { wrapper } = mountWithPlugins(PageShell, {
			props: { title: 'T', subtitleHtml: '<em>html</em>' },
		});
		expect(wrapper.get('.sub').html()).toContain('<em>html</em>');
	});

	it('rend les actions dans le header', () => {
		const { wrapper } = mountWithPlugins(PageShell, {
			props: { title: 'T' },
			slots: { actions: '<button type="button">Act</button>' },
		});
		expect(wrapper.get('.page-head-actions').text()).toContain('Act');
	});
});
