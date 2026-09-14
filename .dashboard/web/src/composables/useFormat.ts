import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { intlLocale, type AppLocale } from '@/i18n';

export function useFormat() {
	const { t, locale } = useI18n();

	const intlLoc = computed(() => intlLocale(locale.value as AppLocale));

	function n(v: unknown) {
		return new Intl.NumberFormat(intlLoc.value).format(Number(v ?? 0));
	}

	function pct(v: unknown) {
		return `${new Intl.NumberFormat(intlLoc.value, { maximumFractionDigits: 1 }).format(Number(v ?? 0))} %`;
	}

	function dt(v: unknown) {
		if (!v) return '—';
		const d = new Date(String(v));
		return Number.isNaN(d.getTime()) ? '—' : new Intl.DateTimeFormat(intlLoc.value, { dateStyle: 'short', timeStyle: 'short' }).format(d);
	}

	function rel(v: unknown) {
		if (!v) return t('never');
		const m = Math.floor((Date.now() - new Date(String(v)).getTime()) / 60000);
		if (m < 60) return t('rel.min', { n: m });
		const h = Math.floor(m / 60);
		if (h < 48) return t('rel.hours', { n: h });
		return t('rel.days', { n: Math.floor(h / 24) });
	}

	function escapeHtml(s: unknown) {
		return String(s).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
	}

	function activityLabel(key: string) {
		const map: Record<string, string> = {
			'24h': 'activity.24h', '7d': 'activity.7d', '30d': 'activity.30d', '90d': 'activity.90d',
			older: 'activity.older', never: 'activity.never',
		};
		const i18nKey = map[key];
		return i18nKey ? t(i18nKey) : key;
	}

	return { n, pct, dt, rel, escapeHtml, activityLabel };
}
