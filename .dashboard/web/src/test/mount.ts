import { mount, type ComponentMountingOptions, type VueWrapper } from '@vue/test-utils';
import { createPinia, setActivePinia, type Pinia } from 'pinia';
import { createI18n, type I18n } from 'vue-i18n';
import type { Component } from 'vue';
import en from '../../../i18n/en.json';
import es from '../../../i18n/es.json';
import fr from '../../../i18n/fr.json';
import ru from '../../../i18n/ru.json';
import zhCN from '../../../i18n/zh-CN.json';

export function createTestI18n(): I18n {
	return createI18n({
		legacy: false,
		locale: 'en',
		fallbackLocale: 'en',
		messages: { en, es, fr, ru, 'zh-CN': zhCN },
	});
}

export function createTestPinia(): Pinia {
	const pinia = createPinia();
	setActivePinia(pinia);
	return pinia;
}

export function mountWithPlugins<C extends Component>(
	component: C,
	options: ComponentMountingOptions<C> = {},
): { wrapper: VueWrapper; pinia: Pinia; i18n: I18n } {
	const pinia = createTestPinia();
	const i18n = createTestI18n();
	const global = options.global || {};
	const wrapper = mount(component, {
		...options,
		global: {
			...global,
			plugins: [pinia, i18n, ...(global.plugins || [])],
		},
	});
	return { wrapper: wrapper as unknown as VueWrapper, pinia, i18n };
}
