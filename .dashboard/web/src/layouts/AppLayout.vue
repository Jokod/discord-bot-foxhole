<template>
  <div
    id="app"
    class="wrap"
  >
    <header class="topbar">
      <div class="topbar-brand">
        <p class="brand">
          Fox<span>Bot</span> stats
        </p>
        <p
          class="meta"
          v-html="metaHtml"
        />
      </div>
      <div class="topbar-tools">
        <div
          v-show="!auth.user?.isDefault && !isSettings"
          class="tool-group"
          role="group"
          :aria-label="t('action.refresh')"
        >
          <button
            type="button"
            :class="{ active: summary.autoRefresh }"
            @click="toggleAuto"
          >
            {{ t('action.auto') }}
          </button>
          <button
            type="button"
            @click="refresh"
          >
            {{ t('action.refresh') }}
          </button>
        </div>
        <div
          ref="userMenuRef"
          class="user-menu"
        >
          <button
            type="button"
            class="user-menu-btn"
            :aria-expanded="ui.userMenuOpen"
            @click.stop="toggleUserMenu"
          >
            <span id="userPill">{{ auth.user?.username }}</span>
            <span
              class="user-caret"
              aria-hidden="true"
            >▾</span>
          </button>
          <div
            v-show="ui.userMenuOpen"
            class="user-menu-panel"
            @click.stop
          >
            <label class="field lang-field">
              <span>{{ t('lang.label') }}</span>
              <select
                v-model="lang"
                @change="changeLang"
              >
                <option value="en">English</option>
                <option value="es">Español</option>
                <option value="fr">Français</option>
                <option value="ru">Русский</option>
                <option value="zh-CN">中文</option>
              </select>
            </label>
            <button
              type="button"
              @click="goSettings"
            >
              {{ t('action.settings') }}
            </button>
            <button
              type="button"
              @click="doLogout"
            >
              {{ t('action.logout') }}
            </button>
          </div>
        </div>
      </div>
    </header>

    <p
      v-if="auth.user?.isDefault"
      class="banner warn"
    >
      {{ t('banner.defaultCreds') }}
    </p>
    <p
      v-if="versionUpdate"
      class="banner info"
    >
      {{ t('banner.updateAvailable', { local: versionUpdate.local, latest: versionUpdate.latest }) }}
      <a
        v-if="versionUpdate.releaseUrl"
        :href="versionUpdate.releaseUrl"
        target="_blank"
        rel="noopener"
      >{{ t('banner.updateLink') }}</a>
    </p>

    <template v-if="!isSettings">
      <div class="stats-chrome">
        <WarBar
          v-if="summary.data?.war"
          :war="summary.data.war"
        />
        <LoadingState
          v-if="summary.loading && !summary.data"
          class="kpis-loading"
          :message="t('meta.loading')"
          inline
        />
        <section
          v-else-if="summary.data"
          class="kpis"
        >
          <div
            v-for="(item, i) in kpiItems"
            :key="i"
            class="kpi"
          >
            <span class="label">{{ item.label }}</span>
            <span class="value">{{ item.value }}</span>
            <span
              v-if="item.hint"
              class="hint"
            >{{ item.hint }}</span>
          </div>
        </section>
      </div>

      <nav
        class="tabs"
        role="navigation"
        :aria-label="t('nav.label')"
      >
        <div class="tabs-inner">
          <RouterLink
            v-for="tab in primaryTabs"
            :key="tab.name"
            :to="tab.to"
            class="tab"
            exact-active-class="active"
          >
            {{ t(tab.label) }}
          </RouterLink>
          <span
            class="tabs-sep"
            aria-hidden="true"
          />
          <RouterLink
            v-for="tab in dataTabs"
            :key="tab.name"
            :to="tab.to"
            class="tab"
            exact-active-class="active"
          >
            {{ t(tab.label) }}
          </RouterLink>
        </div>
      </nav>

      <main class="main-content">
        <RouterView v-slot="{ Component }">
          <Transition
            name="page"
            mode="out-in"
          >
            <component :is="Component" />
          </Transition>
        </RouterView>
      </main>
    </template>
    <main
      v-else
      class="main-content"
    >
      <RouterView />
    </main>

    <footer id="footer">
      <p
        class="footer-meta"
        v-html="footerHtml"
      />
      <nav
        v-if="linksVisible"
        class="footer-links"
        aria-label="Links"
      >
        <a
          v-if="auth.user?.links?.discord"
          class="footer-link"
          :href="auth.user.links.discord"
          target="_blank"
          rel="noopener noreferrer"
        >
          <svg
            class="footer-ico"
            viewBox="0 0 24 24"
            aria-hidden="true"
            focusable="false"
          >
            <path
              fill="currentColor"
              d="M20.317 4.37a19.8 19.8 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.3 18.3 0 0 0-5.487 0 12.6 12.6 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.7 19.7 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.08.08 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.1 13.1 0 0 1-1.872-.892.077.077 0 0 1-.008-.128c.126-.094.252-.192.372-.292a.074.074 0 0 1 .078-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .079.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.3 12.3 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.8 19.8 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.06.06 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418m7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418"
            />
          </svg>
          <span>{{ t('footer.discord') }}</span>
        </a>
        <a
          v-if="auth.user?.links?.github"
          class="footer-link"
          :href="auth.user.links.github"
          target="_blank"
          rel="noopener noreferrer"
        >
          <svg
            class="footer-ico"
            viewBox="0 0 24 24"
            aria-hidden="true"
            focusable="false"
          >
            <path
              fill="currentColor"
              d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"
            />
          </svg>
          <span>{{ t('footer.github') }}</span>
        </a>
      </nav>
    </footer>

    <DrawerHost />
    <GuildModal />
    <WikiSyncConfirmModal />
    <ApiTokenModals v-if="auth.user?.api?.enabled" />
  </div>
</template>

<script setup lang="ts">
import { RouterLink, RouterView } from 'vue-router';
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';
import LoadingState from '@/components/LoadingState.vue';
import WarBar from '@/components/WarBar.vue';
import DrawerHost from '@/components/DrawerHost.vue';
import GuildModal from '@/components/GuildModal.vue';
import WikiSyncConfirmModal from '@/components/WikiSyncConfirmModal.vue';
import ApiTokenModals from '@/components/ApiTokenModals.vue';
import { useAuthStore } from '@/stores/auth';
import { useSummaryStore } from '@/stores/summary';
import { useUiStore } from '@/stores/ui';
import { useFormat } from '@/composables/useFormat';
import { useClickOutside } from '@/composables/useClickOutside';
import { persistLang, type AppLocale } from '@/i18n';
import { api } from '@/api/client';

const { t, locale } = useI18n();
const fmt = useFormat();
const auth = useAuthStore();
const summary = useSummaryStore();
const ui = useUiStore();
const router = useRouter();
const route = useRoute();
const lang = ref(locale.value as AppLocale);
const userMenuRef = ref<HTMLElement | null>(null);
const versionUpdate = ref<{ local: string; latest: string; releaseUrl: string | null } | null>(null);

const isSettings = computed(() => route.name === 'settings');

const primaryTabs = [
	{ name: 'overview', to: { name: 'overview' }, label: 'nav.overview' },
	{ name: 'guilds', to: { name: 'guilds' }, label: 'nav.guilds' },
	{ name: 'commands', to: { name: 'commands' }, label: 'nav.commands' },
	{ name: 'product', to: { name: 'product' }, label: 'nav.product' },
];
const dataTabs = [
	{ name: 'contacts', to: { name: 'contacts' }, label: 'nav.contacts' },
	{ name: 'materials', to: { name: 'materials' }, label: 'nav.materials' },
];

useClickOutside(userMenuRef, () => { ui.userMenuOpen = false; });

const metaHtml = computed(() => {
	if (auth.user?.isDefault) return t('meta.changePassword');
	if (isSettings.value) {
		const s = auth.user?.session;
		if (s?.env_file) {
			const envPill = `<span class="pill ${s.env_file === '.env.prod' ? 'prod' : ''}">${fmt.escapeHtml(s.env_file)} · ${fmt.escapeHtml(s.db_name || '?')}</span>`;
			return envPill;
		}
		return '';
	}
	if (summary.loading) return t('meta.loading');
	if (summary.error) return `<span class="error">${fmt.escapeHtml(summary.error)}</span>`;
	if (!summary.data) return t('meta.loading');
	const d = summary.data;
	const envPill = `<span class="pill ${d.env_file === '.env.prod' ? 'prod' : ''}">${fmt.escapeHtml(d.env_file || '?')} · ${fmt.escapeHtml(d.db_name || '?')}</span>`;
	return `${envPill} ${fmt.dt(d.generated_at)} · ${t('kpi.seen', { n: fmt.n(d.kpis.total_seen_guilds) })}`;
});

const kpiItems = computed(() => {
	const k = summary.data?.kpis;
	const p = summary.data?.product;
	if (!k || !p) return [];
	return [
		{ label: t('kpi.active'), value: fmt.n(k.active_guilds), hint: t('kpi.seen', { n: fmt.n(k.total_seen_guilds) }) },
		{ label: t('chart.setup'), value: fmt.pct(k.setup_rate_pct), hint: `${fmt.n(k.setup_servers)} / ${fmt.n(k.active_guilds)}` },
		{ label: t('kpi.commands'), value: fmt.n(k.total_commands), hint: t('kpi.avg', { n: fmt.n(k.avg_commands_per_active) }) },
		{ label: t('kpi.engaged7d'), value: fmt.pct(k.engagement_7d_pct), hint: fmt.n(k.engaged_7d) },
		{ label: t('kpi.members'), value: fmt.n(k.total_members_active), hint: t('kpi.avg', { n: fmt.n(k.avg_members) }) },
		{ label: t('kpi.stockpiles'), value: fmt.n(k.stockpiles), hint: t('kpi.boards', { n: fmt.n(k.total_stock_boards) }) },
		{ label: t('kpi.lines'), value: fmt.n(k.orderlines), hint: fmt.pct(p.orderline_progress.pct) },
		{ label: t('kpi.left'), value: fmt.n(k.left_guilds), hint: t('kpi.withoutSetup', { n: fmt.n(k.pending_setup) }) },
	];
});

function remainingLabel(expiresAt?: string) {
	if (!expiresAt) return '—';
	const m = Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 60000));
	if (m < 60) return t('rel.min', { n: m });
	const h = Math.floor(m / 60);
	if (h < 48) return t('rel.hours', { n: h });
	return t('rel.days', { n: Math.floor(h / 24) });
}

const footerHtml = computed(() => {
	const s = summary.data?.session || auth.user?.session;
	if (!s) return '';
	const parts: string[] = [];
	if (s.started_at) parts.push(`<span title="${fmt.escapeHtml(fmt.dt(s.started_at))}">${t('footer.since', { when: fmt.escapeHtml(fmt.rel(s.started_at)) })}</span>`);
	if (s.ip) parts.push(`<span>${t('footer.ip', { ip: `<strong>${fmt.escapeHtml(s.ip)}</strong>` })}</span>`);
	if (s.expires_at) parts.push(`<span title="${fmt.escapeHtml(fmt.dt(s.expires_at))}">${t('footer.expires', { when: fmt.escapeHtml(remainingLabel(s.expires_at)) })}</span>`);
	parts.push(`<span>${t('footer.sessions', { n: fmt.escapeHtml(String(s.active_sessions || 1)) })}</span>`);
	return parts.join('<span class="sep" aria-hidden="true">·</span>');
});

const linksVisible = computed(() => Boolean(auth.user?.links?.discord || auth.user?.links?.github));

function toggleUserMenu() {
	ui.userMenuOpen = !ui.userMenuOpen;
}
async function refresh() {
	await summary.load(false);
}
function toggleAuto() {
	summary.autoRefresh = !summary.autoRefresh;
	summary.scheduleAuto(summary.autoRefresh, Boolean(auth.user?.isDefault));
}
function goSettings() {
	ui.userMenuOpen = false;
	router.push({ name: 'settings', params: { tab: 'account' } });
}
async function doLogout() {
	summary.stopAuto();
	ui.closeDrawer();
	ui.userMenuOpen = false;
	await auth.logout();
	router.push({ name: 'login' });
}
function changeLang() {
	persistLang(lang.value);
	locale.value = lang.value;
}

onMounted(() => {
	if (!auth.user?.isDefault) {
		summary.scheduleAuto(summary.autoRefresh, false);
		if (!summary.data) summary.load(false).catch(() => {});
		api<{ local: string; latest: string | null; updateAvailable: boolean; releaseUrl: string | null }>('/api/version')
			.then((v) => {
				if (v.updateAvailable && v.latest) {
					versionUpdate.value = {
						local: v.local,
						latest: v.latest,
						releaseUrl: v.releaseUrl,
					};
				}
			})
			.catch(() => {});
	}
});

onUnmounted(() => summary.stopAuto());

watch(() => auth.user?.isDefault, (d) => {
	summary.scheduleAuto(summary.autoRefresh, Boolean(d));
});

watch(() => route.name, () => {
	ui.closeDrawer();
});
</script>
