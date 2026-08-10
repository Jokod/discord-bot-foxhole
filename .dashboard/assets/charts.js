'use strict';

(function() {
	'use strict';

	window.Dashboard = window.Dashboard || {};

	const charts = {};
	const palette = ['#b4451a', '#2f6b4f', '#3d5a80', '#9a6b12', '#6b4f2f', '#8f3412', '#4a7c6f', '#c47a3a', '#5c564c', '#2c3e50', '#7a5c3a', '#1f6f8b'];

	function setEmpty(canvasId, empty) {
		const el = document.getElementById(`empty-${canvasId}`);
		if (el) el.hidden = !empty;
		const canvas = document.getElementById(canvasId);
		if (canvas) canvas.style.opacity = empty ? '0' : '1';
	}

	function destroyChart(id) {
		if (!charts[id]) return;
		charts[id].destroy();
		delete charts[id];
	}

	function barOpts(horizontal = false) {
		return {
			responsive: true,
			maintainAspectRatio: false,
			indexAxis: horizontal ? 'y' : 'x',
			plugins: { legend: { display: false } },
			scales: {
				x: { beginAtZero: true, ticks: { font: { family: 'JetBrains Mono', size: 10 } }, grid: { color: 'rgba(0,0,0,.05)' } },
				y: { beginAtZero: true, ticks: { font: { family: 'JetBrains Mono', size: 10 } }, grid: { color: 'rgba(0,0,0,.05)' } },
			},
			onClick: null,
		};
	}

	function doughnutOpts() {
		return {
			responsive: true,
			maintainAspectRatio: false,
			plugins: {
				legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 11 } } },
			},
		};
	}

	function makeChart(id, config, empty = false) {
		destroyChart(id);
		setEmpty(id, empty);
		if (empty) return;
		const el = document.getElementById(id);
		if (!el) return;
		charts[id] = new Chart(el, config);
	}

	function series(items, nameKey = 'name', valueKey = 'total') {
		const list = items || [];
		const values = list.map((x) => Number(x[valueKey]) || 0);
		return {
			labels: list.map((x) => x[nameKey]),
			values,
			empty: !list.length || values.every((v) => v <= 0),
		};
	}

	function activityLabel(key) {
		const map = {
			'24h': 'activity.24h',
			'7d': 'activity.7d',
			'30d': 'activity.30d',
			'90d': 'activity.90d',
			older: 'activity.older',
			never: 'activity.never',
			'7j': 'activity.7d',
			'30j': 'activity.30d',
			'90j': 'activity.90d',
			'>90j': 'activity.older',
			jamais: 'activity.never',
		};
		const i18nKey = map[key];
		return i18nKey ? window.DashboardI18n.t(i18nKey) : key;
	}

	function localizeActivityBuckets(buckets) {
		return (buckets || []).map((b) => ({
			...b,
			name: activityLabel(b.name),
		}));
	}

	window.Dashboard.charts = charts;
	window.Dashboard.palette = palette;
	window.Dashboard.setEmpty = setEmpty;
	window.Dashboard.destroyChart = destroyChart;
	window.Dashboard.barOpts = barOpts;
	window.Dashboard.doughnutOpts = doughnutOpts;
	window.Dashboard.makeChart = makeChart;
	window.Dashboard.series = series;
	window.Dashboard.activityLabel = activityLabel;
	window.Dashboard.localizeActivityBuckets = localizeActivityBuckets;
})();
