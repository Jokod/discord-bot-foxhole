'use strict';

(function() {
	'use strict';

	window.Dashboard = window.Dashboard || {};

	const { t, locale } = window.DashboardI18n;

	const fmt = {
		n: (v) => new Intl.NumberFormat(locale()).format(v ?? 0),
		pct: (v) => `${new Intl.NumberFormat(locale(), { maximumFractionDigits: 1 }).format(v ?? 0)} %`,
		dt: (v) => {
			if (!v) return '—';
			const d = new Date(v);
			return Number.isNaN(d.getTime()) ? '—' : new Intl.DateTimeFormat(locale(), { dateStyle: 'short', timeStyle: 'short' }).format(d);
		},
		rel: (v) => {
			if (!v) return t('never');
			const m = Math.floor((Date.now() - new Date(v).getTime()) / 60000);
			if (m < 60) return t('rel.min', { n: m });
			const h = Math.floor(m / 60);
			if (h < 48) return t('rel.hours', { n: h });
			return t('rel.days', { n: Math.floor(h / 24) });
		},
	};

	function escapeHtml(s) {
		return String(s).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
	}

	window.Dashboard.fmt = fmt;
	window.Dashboard.escapeHtml = escapeHtml;
})();
