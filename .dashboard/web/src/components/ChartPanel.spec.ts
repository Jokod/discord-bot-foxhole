import { describe, expect, it, vi } from 'vitest';
import { mountWithPlugins } from '@/test/mount';

vi.mock('vue-chartjs', () => ({
	Line: { name: 'Line', template: '<div class="chart-stub line" />' },
	Bar: { name: 'Bar', template: '<div class="chart-stub bar" />' },
	Doughnut: { name: 'Doughnut', template: '<div class="chart-stub doughnut" />' },
}));

import ChartPanel from './ChartPanel.vue';

describe('ChartPanel', () => {
	it('affiche empty state', () => {
		const { wrapper } = mountWithPlugins(ChartPanel, {
			props: { type: 'line', data: null, empty: true },
		});
		expect(wrapper.find('.chart-empty').isVisible()).toBe(true);
		expect(wrapper.find('.chart-empty').text()).toBeTruthy();
	});

	it('monte Line pour type line', () => {
		const data = { labels: ['a'], datasets: [{ data: [1] }] };
		const { wrapper } = mountWithPlugins(ChartPanel, {
			props: { type: 'line', data, empty: false, size: 'sm' },
		});
		expect(wrapper.classes()).toContain('sm');
		expect(wrapper.find('.chart-stub.line').exists()).toBe(true);
	});

	it('monte Bar et Doughnut selon le type', () => {
		const data = { labels: ['a'], datasets: [{ data: [1] }] };
		const bar = mountWithPlugins(ChartPanel, {
			props: { type: 'bar', data, size: 'lg' },
		});
		expect(bar.wrapper.classes()).toContain('lg');
		expect(bar.wrapper.find('.chart-stub.bar').exists()).toBe(true);

		const doughnut = mountWithPlugins(ChartPanel, {
			props: { type: 'doughnut', data },
		});
		expect(doughnut.wrapper.find('.chart-stub.doughnut').exists()).toBe(true);
	});
});
