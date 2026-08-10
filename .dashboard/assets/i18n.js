'use strict';

/* global localStorage */

(function initDashboardI18n(global) {
	const SUPPORTED = ['en', 'fr', 'ru', 'zh-CN'];
	const STORAGE_KEY = 'foxbot_dashboard_lang';
	const LOCALE_MAP = {
		en: 'en-US',
		fr: 'fr-FR',
		ru: 'ru-RU',
		'zh-CN': 'zh-CN',
	};

	let catalog = {};
	let currentLang = 'en';

	function normalizeLang(raw) {
		if (!raw) return null;
		const s = String(raw).trim();
		if (SUPPORTED.includes(s)) return s;
		const lower = s.toLowerCase();
		if (lower === 'zh' || lower.startsWith('zh-')) return 'zh-CN';
		if (lower.startsWith('fr')) return 'fr';
		if (lower.startsWith('ru')) return 'ru';
		if (lower.startsWith('en')) return 'en';
		return null;
	}

	function detectLang() {
		const stored = normalizeLang(localStorage.getItem(STORAGE_KEY));
		if (stored) return stored;
		const nav = (navigator.languages && navigator.languages[0]) || navigator.language || 'en';
		return normalizeLang(nav) || 'en';
	}

	function t(key, params = {}) {
		let s = catalog[key];
		if (s == null) s = key;
		return String(s).replace(/\{(\w+)\}/g, (_, name) => (
			params[name] != null ? String(params[name]) : `{${name}}`
		));
	}

	function locale() {
		return LOCALE_MAP[currentLang] || 'en-US';
	}

	function getLang() {
		return currentLang;
	}

	function applyDomI18n(root = document) {
		root.querySelectorAll('[data-i18n]').forEach((el) => {
			const key = el.getAttribute('data-i18n');
			if (key) el.textContent = t(key);
		});
		root.querySelectorAll('[data-i18n-html]').forEach((el) => {
			const key = el.getAttribute('data-i18n-html');
			if (key) el.innerHTML = t(key);
		});
		root.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
			const key = el.getAttribute('data-i18n-placeholder');
			if (key) el.setAttribute('placeholder', t(key));
		});
		root.querySelectorAll('[data-i18n-title]').forEach((el) => {
			const key = el.getAttribute('data-i18n-title');
			if (key) el.setAttribute('title', t(key));
		});
		document.title = t('title');
		document.documentElement.lang = currentLang === 'zh-CN' ? 'zh-CN' : currentLang;
	}

	async function loadLang(lang) {
		const resolved = normalizeLang(lang) || 'en';
		const res = await fetch(`/i18n/${encodeURIComponent(resolved)}.json`, { credentials: 'same-origin' });
		if (!res.ok) throw new Error(`i18n ${resolved}: ${res.status}`);
		catalog = await res.json();
		currentLang = resolved;
		localStorage.setItem(STORAGE_KEY, resolved);
		applyDomI18n();
		return currentLang;
	}

	function apiMessage(data, fallbackKey) {
		if (data?.code && catalog[data.code]) {
			return t(data.code, data.params || {});
		}
		if (data?.error) return data.error;
		return t(fallbackKey || 'error.auth');
	}

	global.DashboardI18n = {
		SUPPORTED,
		detectLang,
		loadLang,
		t,
		locale,
		getLang,
		applyDomI18n,
		apiMessage,
	};
}(window));
