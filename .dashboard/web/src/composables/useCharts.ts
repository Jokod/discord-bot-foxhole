import type { ChartOptions } from 'chart.js';
import { useFormat } from './useFormat';

export const palette = ['#b4451a', '#2f6b4f', '#3d5a80', '#9a6b12', '#6b4f2f', '#8f3412', '#4a7c6f', '#c47a3a', '#5c564c', '#2c3e50', '#7a5c3a', '#1f6f8b'];

export function barOpts(horizontal = false): ChartOptions<'bar'> {
	return {
		responsive: true,
		maintainAspectRatio: false,
		indexAxis: horizontal ? 'y' : 'x',
		plugins: { legend: { display: false } },
		scales: {
			x: { beginAtZero: true, ticks: { font: { family: 'JetBrains Mono', size: 10 } }, grid: { color: 'rgba(0,0,0,.05)' } },
			y: { beginAtZero: true, ticks: { font: { family: 'JetBrains Mono', size: 10 } }, grid: { color: 'rgba(0,0,0,.05)' } },
		},
	};
}

export function doughnutOpts(): ChartOptions<'doughnut'> {
	return {
		responsive: true,
		maintainAspectRatio: false,
		plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 11 } } } },
	};
}

export function series<T extends Record<string, unknown>>(items: T[] | undefined, nameKey = 'name', valueKey = 'total') {
	const list = items || [];
	const values = list.map((x) => Number(x[valueKey]) || 0);
	return {
		labels: list.map((x) => String(x[nameKey])),
		values,
		empty: !list.length || values.every((v) => v <= 0),
	};
}

export function useActivityBuckets() {
	const { activityLabel } = useFormat();
	return (buckets: { name: string; total: number }[] | undefined) =>
		(buckets || []).map((b) => ({ ...b, name: activityLabel(b.name) }));
}

export function lineChartOpts(): ChartOptions<'line'> {
	return {
		responsive: true,
		maintainAspectRatio: false,
		plugins: { legend: { position: 'bottom' } },
		scales: {
			x: { ticks: { font: { family: 'JetBrains Mono', size: 10 } }, grid: { color: 'rgba(0,0,0,.04)' } },
			y: { beginAtZero: true, ticks: { font: { family: 'JetBrains Mono', size: 10 } }, grid: { color: 'rgba(0,0,0,.06)' } },
		},
	};
}
