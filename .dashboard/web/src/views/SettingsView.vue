<template>
  <PageShell :title="t('settings.title')">
    <p
      v-if="!auth.user?.isDefault"
      class="profile-back"
    >
      <button
        type="button"
        @click="router.push({ name: 'overview' })"
      >
        {{ t('action.backToStats') }}
      </button>
    </p>
    <div class="settings-shell">
      <nav class="settings-nav panel">
        <button
          type="button"
          class="settings-nav-item"
          :class="{ active: tab === 'account' }"
          @click="goTab('account')"
        >
          {{ t('settings.nav.account') }}
        </button>
        <button
          v-if="apiEnabled"
          type="button"
          class="settings-nav-item"
          :class="{ active: tab === 'api' }"
          @click="goTab('api')"
        >
          {{ t('settings.nav.api') }}
        </button>
        <button
          v-if="auth.user?.wiki_sync?.enabled"
          type="button"
          class="settings-nav-item"
          :class="{ active: tab === 'wiki' }"
          @click="goTab('wiki')"
        >
          {{ t('settings.nav.wiki') }}
        </button>
      </nav>
      <div class="settings-panels">
        <SectionPanel
          v-if="tab === 'account'"
          :title="t('profile.title')"
          :subtitle="t('profile.sub')"
        >
          <form
            class="profile-form"
            @submit.prevent="saveProfile"
          >
            <label class="field"><span>{{ t('profile.username') }}</span><input
              v-model="profileUser"
              required
              minlength="3"
              maxlength="64"
            ></label>
            <label class="field"><span>{{ t('profile.currentPassword') }}</span><input
              v-model="profileCurrent"
              type="password"
              required
            ></label>
            <label class="field"><span>{{ t('profile.newPassword') }}</span><input
              v-model="profileNew"
              type="password"
              minlength="10"
              maxlength="128"
            ></label>
            <label class="field"><span>{{ t('profile.confirmPassword') }}</span><input
              v-model="profileNew2"
              type="password"
              minlength="10"
              maxlength="128"
            ></label>
            <p
              v-if="profileError"
              class="error"
            >
              {{ profileError }}
            </p>
            <p
              v-if="profileOk"
              class="ok-msg"
            >
              {{ profileOk }}
            </p>
            <button type="submit">
              {{ t('profile.save') }}
            </button>
          </form>
        </SectionPanel>
        <SectionPanel
          v-if="tab === 'api' && apiEnabled"
          :title="t('settings.api.title')"
          :subtitle="t('settings.api.sub')"
        >
          <div class="settings-block">
            <h3 class="settings-block-title">
              {{ t('settings.api.howTitle') }}
            </h3>
            <ol class="settings-steps">
              <li>{{ t('settings.api.how1') }}</li>
              <li>{{ t('settings.api.how2') }}</li>
              <li>{{ t('settings.api.how3') }}</li>
            </ol>
          </div>

          <div
            v-if="activeScopes.length"
            class="settings-block"
          >
            <h3 class="settings-block-title">
              {{ t('settings.api.scopesTitle') }}
            </h3>
            <div class="api-scope-grid">
              <article
                v-for="scope in activeScopes"
                :key="scope.id"
                class="api-scope-card"
              >
                <h4>{{ t(scope.label) }}</h4>
                <p>{{ t(scope.desc) }}</p>
                <code
                  v-for="p in scope.paths"
                  :key="p"
                  class="mono scope-option-path"
                >{{ t('settings.api.scopePath', { path: p }) }}</code>
              </article>
            </div>
          </div>

          <div class="settings-block">
            <div class="settings-block-head">
              <h3 class="settings-block-title">
                {{ t('settings.api.tokensTitle') }}
              </h3>
              <div class="settings-toolbar">
                <button
                  type="button"
                  class="btn-primary"
                  @click="ui.apiTokenModalOpen = true"
                >
                  {{ t('profile.apiTokens.create') }}
                </button>
                <a
                  v-if="auth.user?.api?.docs"
                  class="btn-link"
                  href="/api/docs"
                  target="_blank"
                  rel="noopener"
                >{{ t('profile.apiTokens.docs') }}</a>
              </div>
            </div>
            <p class="settings-hint">
              {{ t('settings.api.authHeader') }}
            </p>
            <LoadingState
              v-if="tokensLoading && !tokens.length"
              :message="t('meta.loading')"
            />
            <div
              v-else-if="tokens.length"
              class="table-wrap settings-table-wrap"
            >
              <table class="settings-table">
                <thead>
                  <tr>
                    <th>{{ t('profile.apiTokens.colLabel') }}</th>
                    <th>{{ t('profile.apiTokens.colScopes') }}</th>
                    <th>{{ t('profile.apiTokens.colPrefix') }}</th>
                    <th>{{ t('profile.apiTokens.colExpires') }}</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="tok in tokens"
                    :key="tok.jti"
                  >
                    <td>{{ tok.label }}</td>
                    <td>
                      <span
                        v-for="s in tok.scopes"
                        :key="s"
                        class="badge info"
                      >{{ scopeLabel(s) }}</span>
                    </td>
                    <td><code class="mono">{{ tok.token_prefix }}…</code></td>
                    <td>{{ tok.expires_at ? fmt.dt(tok.expires_at) : '—' }}</td>
                    <td class="actions">
                      <button
                        type="button"
                        class="btn-danger-soft"
                        @click="revoke(tok.jti)"
                      >
                        {{ t('profile.apiTokens.revoke') }}
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <EmptyState
              v-else-if="tokensReady"
              :message="t('profile.apiTokens.empty')"
            />
          </div>
        </SectionPanel>
        <SectionPanel
          v-if="tab === 'wiki'"
          :title="t('materials.wikiSync.title')"
          :subtitle="t('materials.wikiSync.sub')"
          class="wiki-sync-panel"
        >
          <p class="settings-intro">
            {{ t('materials.wikiSync.intro') }}
          </p>

          <div class="settings-block">
            <h3 class="settings-block-title">
              {{ t('materials.wikiSync.flowTitle') }}
            </h3>
            <ol class="settings-steps">
              <li>{{ t('materials.wikiSync.flow1') }}</li>
              <li>{{ t('materials.wikiSync.flow2') }}</li>
              <li>{{ t('materials.wikiSync.flow3') }}</li>
            </ol>
          </div>

          <div class="settings-block">
            <h3 class="settings-block-title">
              {{ t('materials.wikiSync.optionsTitle') }}
            </h3>
            <div class="wiki-sync-controls">
              <label class="field field-wide"><span>{{ t('materials.wikiSync.mode') }}</span>
                <select
                  v-model="wiki.mode"
                  :disabled="wiki.running"
                >
                  <option value="sync">
                    {{ t('materials.wikiSync.modeSync') }}
                  </option>
                  <option value="add-missing">
                    {{ t('materials.wikiSync.modeAddMissing') }}
                  </option>
                  <option value="add-missing-sync">
                    {{ t('materials.wikiSync.modeAddMissingSync') }}
                  </option>
                  <option value="icons">
                    {{ t('materials.wikiSync.modeIcons') }}
                  </option>
                </select>
              </label>
              <p class="settings-hint">
                {{ wikiModeHelp }}
              </p>
              <div class="wiki-sync-options">
                <label class="check-row"><input
                  v-model="wiki.dryRun"
                  type="checkbox"
                  :disabled="wiki.running"
                ><span>{{ t('materials.wikiSync.dryRun') }}</span></label>
                <label
                  v-if="writeOk"
                  class="check-row"
                ><input
                  v-model="wiki.apply"
                  type="checkbox"
                  :disabled="wiki.running"
                ><span>{{ t('materials.wikiSync.apply') }}</span></label>
                <span
                  v-if="!writeOk"
                  class="badge warn"
                >{{ t('materials.wikiSync.previewOnly') }}</span>
              </div>
            </div>
          </div>

          <div class="settings-block">
            <h3 class="settings-block-title">
              {{ t('materials.wikiSync.runTitle') }}
            </h3>
            <div class="wiki-sync-run">
              <div
                v-if="wiki.running"
                class="wiki-sync-status wiki-sync-status--active"
              >
                <div class="wiki-sync-status-main">
                  <span
                    class="wiki-sync-pulse"
                    aria-hidden="true"
                  />
                  <div>
                    <strong>{{ t('materials.wikiSync.running') }}</strong>
                    <p
                      v-if="runningPhase"
                      class="wiki-sync-status-detail"
                    >
                      {{ runningPhase }}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  class="danger"
                  @click="wiki.abort()"
                >
                  {{ t('materials.wikiSync.abort') }}
                </button>
              </div>

              <div
                v-else-if="onCooldown"
                class="wiki-sync-status wiki-sync-status--cooldown"
              >
                <p class="wiki-sync-cooldown-message">
                  <I18nT
                    keypath="materials.wikiSync.cooldown"
                    tag="span"
                  >
                    <template #time>
                      <span class="wiki-sync-cooldown-time">{{ cooldownTimeFormatted }}</span>
                    </template>
                  </I18nT>
                </p>
                <div
                  class="wiki-sync-cooldown-bar"
                  role="progressbar"
                  :aria-valuenow="cooldownElapsed"
                  aria-valuemin="0"
                  aria-valuemax="100"
                  :aria-label="t('materials.wikiSync.cooldown', { time: cooldownTimeFormatted })"
                >
                  <div
                    class="wiki-sync-cooldown-fill"
                    :style="{ width: `${cooldownElapsed}%` }"
                  />
                </div>
              </div>

              <button
                v-else
                type="button"
                class="active"
                @click="runWiki"
              >
                {{ t('materials.wikiSync.start') }}
              </button>
            </div>
            <div
              v-if="showWikiLog"
              class="wiki-sync-live"
            >
              <p v-if="finishedPhase">
                <strong>{{ t('materials.wikiSync.phaseLabel') }}</strong>: {{ finishedPhase }}
              </p>
              <pre class="wiki-sync-log">{{ logText }}</pre>
            </div>
            <p
              v-if="wiki.error && !onCooldown"
              class="error"
            >
              {{ wiki.error }}
            </p>
          </div>
        </SectionPanel>
      </div>
    </div>
  </PageShell>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { I18nT, useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';
import { api } from '@/api/client';
import EmptyState from '@/components/EmptyState.vue';
import LoadingState from '@/components/LoadingState.vue';
import PageShell from '@/components/PageShell.vue';
import SectionPanel from '@/components/SectionPanel.vue';
import { API_SCOPE_DEFS } from '@/lib/apiScopes';
import { formatWikiSyncLogs, wikiSyncPhaseLabel } from '@/lib/wikiSyncPhase';
import { useAuthStore } from '@/stores/auth';
import { useUiStore } from '@/stores/ui';
import { useWikiSyncStore } from '@/stores/wikiSync';
import { useFormat } from '@/composables/useFormat';
import type { ApiToken, SettingsTab } from '@/types';

const { t } = useI18n();
const auth = useAuthStore();
const ui = useUiStore();
const wiki = useWikiSyncStore();
const fmt = useFormat();
const route = useRoute();
const router = useRouter();

const tab = computed(() => {
	const raw = route.params.tab as string | undefined;
	if (raw === 'api-tokens') return 'api';
	if (raw === 'wiki-sync') return 'wiki';
	return (raw as SettingsTab) || 'account';
});
const apiEnabled = computed(() => Boolean(auth.user?.api?.enabled));
const writeOk = computed(() => Boolean(auth.user?.wiki_sync?.write_enabled));
const tokens = ref<ApiToken[]>([]);
const tokensLoading = ref(false);
const tokensReady = ref(false);
let tokensLoadSeq = 0;

const activeScopes = computed(() => {
	const enabled = new Set(auth.user?.api?.scopes || []);
	return API_SCOPE_DEFS.filter((s) => enabled.has(s.id));
});

const wikiModeHelp = computed(() => {
	const map: Record<string, string> = {
		sync: 'materials.wikiSync.modeHelpSync',
		'add-missing': 'materials.wikiSync.modeHelpAddMissing',
		'add-missing-sync': 'materials.wikiSync.modeHelpAddMissingSync',
		icons: 'materials.wikiSync.modeHelpIcons',
	};
	return t(map[wiki.mode] || map.sync);
});

const profileUser = ref(auth.user?.username || '');
const profileCurrent = ref('');
const profileNew = ref('');
const profileNew2 = ref('');
const profileError = ref('');
const profileOk = ref('');

watch(() => auth.user?.username, (u) => { if (u) profileUser.value = u; });

watch(() => [route.params.tab, apiEnabled.value, auth.user?.wiki_sync?.enabled] as const, ([raw, enabled, wikiEnabled]) => {
	const normalized = raw === 'api-tokens' ? 'api' : raw === 'wiki-sync' ? 'wiki' : raw;
	if (normalized === 'api' && !enabled) {
		router.replace({ name: 'settings', params: { tab: 'account' } });
		return;
	}
	if (normalized === 'wiki' && !wikiEnabled) {
		router.replace({ name: 'settings', params: { tab: 'account' } });
		return;
	}
	if (raw === 'api-tokens') {
		router.replace({ name: 'settings', params: { tab: 'api' } });
		return;
	}
	if (raw === 'wiki-sync') {
		router.replace({ name: 'settings', params: { tab: 'wiki' } });
	}
}, { immediate: true });

function goTab(name: SettingsTab) {
	router.push({ name: 'settings', params: { tab: name } });
}

function scopeLabel(id: string) {
	const def = API_SCOPE_DEFS.find((s) => s.id === id);
	return def ? t(def.label) : id;
}

async function loadTokens() {
	if (!apiEnabled.value) return;
	const seq = ++tokensLoadSeq;
	tokensLoading.value = true;
	try {
		const data = await api<{ tokens: ApiToken[] }>('/api/profile/tokens');
		if (seq !== tokensLoadSeq) return;
		tokens.value = data.tokens || [];
	}
	catch {
		if (seq !== tokensLoadSeq) return;
		tokens.value = [];
	}
	finally {
		if (seq === tokensLoadSeq) {
			tokensLoading.value = false;
			tokensReady.value = true;
		}
	}
}

async function revoke(jti: string) {
	await api(`/api/profile/tokens/${encodeURIComponent(jti)}`, { method: 'DELETE', body: '{}' });
	await loadTokens();
}

async function saveProfile() {
	profileError.value = '';
	profileOk.value = '';
	if ((profileNew.value || profileNew2.value || auth.user?.isDefault) && profileNew.value !== profileNew2.value) {
		profileError.value = t('profile.mismatch');
		return;
	}
	if (auth.user?.isDefault && !profileNew.value) {
		profileError.value = t('profile.needNew', { min: 10 });
		return;
	}
	try {
		await auth.updateProfile({
			username: profileUser.value,
			currentPassword: profileCurrent.value,
			newPassword: profileNew.value || undefined,
		});
		profileCurrent.value = '';
		profileNew.value = '';
		profileNew2.value = '';
		profileOk.value = t('profile.ok');
	}
	catch (err) {
		profileError.value = err instanceof Error ? err.message : t('error.profileFailed');
	}
}

const onCooldown = computed(() => {
	tick.value;
	return wiki.cooldownUntil > Date.now();
});
const cooldownRemainingMs = computed(() => {
	tick.value;
	return Math.max(0, wiki.cooldownUntil - Date.now());
});
const cooldownTimeFormatted = computed(() => {
	const sec = Math.max(0, Math.ceil(cooldownRemainingMs.value / 1000));
	const mm = String(Math.floor(sec / 60)).padStart(2, '0');
	const ss = String(sec % 60).padStart(2, '0');
	return `${mm}:${ss}`;
});
const cooldownElapsed = computed(() => {
	const total = wiki.cooldownDurationMs || cooldownRemainingMs.value;
	if (!total) return 0;
	return Math.min(100, Math.max(0, Math.round(((total - cooldownRemainingMs.value) / total) * 100)));
});
const runningPhase = computed(() => wikiSyncPhaseLabel(
	t,
	wiki.status?.phase || (wiki.status?.status !== 'running' ? wiki.status?.status : null),
	wiki.status?.progress,
));
const finishedPhase = computed(() => {
	if (wiki.running || onCooldown.value) return '';
	return wikiSyncPhaseLabel(t, wiki.status?.phase || wiki.status?.status, wiki.status?.progress);
});
const logText = computed(() => formatWikiSyncLogs(t, wiki.status?.logs, wiki.status?.progress));
const showWikiLog = computed(() => Boolean(logText.value) && !onCooldown.value);
const tick = ref(Date.now());
let tickTimer: ReturnType<typeof setInterval> | null = null;

function syncTickTimer() {
	const active = wiki.running || wiki.cooldownUntil > Date.now();
	if (active && !tickTimer) {
		tick.value = Date.now();
		tickTimer = setInterval(() => { tick.value = Date.now(); }, 1000);
	}
	else if (!active && tickTimer) {
		clearInterval(tickTimer);
		tickTimer = null;
	}
}

watch(() => wiki.cooldownUntil, (until) => {
	if (until > Date.now()) tick.value = Date.now();
});

watch(() => [wiki.running, wiki.cooldownUntil, tick.value] as const, syncTickTimer, { immediate: true });

onUnmounted(() => {
	if (tickTimer) clearInterval(tickTimer);
});

function runWiki() {
	const dry = wiki.dryRun || !wiki.apply || !writeOk.value;
	if (!dry) ui.wikiConfirmOpen = true;
	else wiki.start(true);
}

onMounted(() => {
	// Prefetch tokens so the API tab is ready when switching from wiki/account.
	if (apiEnabled.value) loadTokens();
});
watch(tab, (tname) => {
	if (tname === 'api' && apiEnabled.value && !tokensReady.value && !tokensLoading.value) {
		loadTokens();
	}
});
watch(() => ui.apiTokensRevision, () => {
	if (apiEnabled.value) loadTokens();
});
</script>
