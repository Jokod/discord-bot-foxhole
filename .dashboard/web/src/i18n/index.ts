import { createI18n } from 'vue-i18n';
import en from '../../../i18n/en.json';
import es from '../../../i18n/es.json';
import fr from '../../../i18n/fr.json';
import ru from '../../../i18n/ru.json';
import zhCN from '../../../i18n/zh-CN.json';

const SUPPORTED = ['en', 'es', 'fr', 'ru', 'zh-CN'] as const;
export type AppLocale = typeof SUPPORTED[number];
const STORAGE_KEY = 'foxbot_dashboard_lang';

const LOCALE_MAP: Record<AppLocale, string> = {
	en: 'en-US',
	es: 'es-ES',
	fr: 'fr-FR',
	ru: 'ru-RU',
	'zh-CN': 'zh-CN',
};

function normalizeLang(raw: string | null | undefined): AppLocale | null {
	if (!raw) return null;
	const s = String(raw).trim();
	if ((SUPPORTED as readonly string[]).includes(s)) return s as AppLocale;
	const lower = s.toLowerCase();
	if (lower === 'zh' || lower.startsWith('zh-')) return 'zh-CN';
	if (lower.startsWith('es')) return 'es';
	if (lower.startsWith('fr')) return 'fr';
	if (lower.startsWith('ru')) return 'ru';
	if (lower.startsWith('en')) return 'en';
	return null;
}

export function detectLang(): AppLocale {
	const stored = normalizeLang(localStorage.getItem(STORAGE_KEY));
	if (stored) return stored;
	const nav = (navigator.languages && navigator.languages[0]) || navigator.language || 'en';
	return normalizeLang(nav) || 'en';
}

export function persistLang(lang: AppLocale) {
	localStorage.setItem(STORAGE_KEY, lang);
}

export function intlLocale(lang: AppLocale) {
	return LOCALE_MAP[lang] || 'en-US';
}

export const i18n = createI18n({
	legacy: false,
	locale: detectLang(),
	fallbackLocale: 'en',
	messages: { en, es, fr, ru, 'zh-CN': zhCN },
});

export { SUPPORTED };
