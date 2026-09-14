<template>
  <div
    v-if="ui.apiTokenModalOpen"
    class="modal-backdrop"
    @click.self="ui.apiTokenModalOpen = false"
  >
    <div
      class="modal-card"
      role="dialog"
    >
      <h3>{{ t('profile.apiTokens.create') }}</h3>
      <label class="field"><span>{{ t('profile.apiTokens.colLabel') }}</span><input v-model="label"></label>
      <label class="field"><span>{{ t('profile.currentPassword') }}</span><input
        v-model="password"
        type="password"
      ></label>
      <label class="field"><span>{{ t('profile.apiTokens.expiresDays') }}</span><input
        v-model.number="expires"
        type="number"
        min="1"
        max="365"
        :placeholder="t('profile.apiTokens.expiresPh')"
      ></label>
      <fieldset class="scope-fieldset">
        <legend>{{ t('profile.apiTokens.colScopes') }}</legend>
        <div class="scope-options">
          <label
            v-for="scope in scopeOptions"
            :key="scope.id"
            class="scope-option"
            :class="{ checked: selectedScopes.includes(scope.id) }"
          >
            <input
              v-model="selectedScopes"
              type="checkbox"
              :value="scope.id"
            >
            <span class="scope-option-body">
              <span class="scope-option-title">{{ t(scope.label) }}</span>
              <span class="scope-option-desc">{{ t(scope.desc) }}</span>
              <code
                v-for="p in scope.paths"
                :key="p"
                class="mono scope-option-path"
              >{{ t('settings.api.scopePath', { path: p }) }}</code>
            </span>
          </label>
        </div>
      </fieldset>
      <p
        v-if="error"
        class="error"
      >
        {{ error }}
      </p>
      <div class="modal-actions">
        <button
          type="button"
          @click="ui.apiTokenModalOpen = false"
        >
          {{ t('guilds.modalCancel') }}
        </button><button
          type="button"
          @click="create"
        >
          {{ t('profile.apiTokens.create') }}
        </button>
      </div>
    </div>
  </div>
  <div
    v-if="ui.apiTokenReveal"
    class="modal-backdrop"
  >
    <div
      class="modal-card token-reveal-card"
      role="dialog"
    >
      <h3>{{ t('profile.apiTokens.revealTitle') }}</h3>
      <p class="token-reveal-warn">
        {{ t('profile.apiTokens.revealWarn') }}
      </p>
      <div class="token-reveal-row">
        <code class="token-reveal-code mono">{{ ui.apiTokenReveal }}</code>
        <button
          type="button"
          class="token-copy-btn"
          @click="copyToken"
        >
          {{ copied ? t('profile.apiTokens.copied') : t('contacts.copy') }}
        </button>
      </div>
      <button
        type="button"
        @click="closeReveal"
      >
        {{ t('drawer.close') }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { api } from '@/api/client';
import { API_SCOPE_DEFS } from '@/lib/apiScopes';
import { useAuthStore } from '@/stores/auth';
import { useUiStore } from '@/stores/ui';

const { t } = useI18n();
const auth = useAuthStore();
const ui = useUiStore();
const label = ref('');
const password = ref('');
const expires = ref(90);
const selectedScopes = ref<string[]>([]);
const error = ref('');
const copied = ref(false);
let copiedTimer: ReturnType<typeof setTimeout> | null = null;

const scopeOptions = computed(() => {
	const enabled = new Set(auth.user?.api?.scopes || []);
	return API_SCOPE_DEFS.filter((s) => enabled.has(s.id));
});

async function create() {
	error.value = '';
	try {
		const created = await api<{ token: string }>('/api/profile/tokens', {
			method: 'POST',
			body: JSON.stringify({ label: label.value, scopes: selectedScopes.value, expires_in_days: expires.value, currentPassword: password.value }),
		});
		ui.apiTokenModalOpen = false;
		ui.apiTokenReveal = created.token;
	}
	catch (err) {
		error.value = err instanceof Error ? err.message : t('error.generic', { msg: 'failed' });
	}
}

async function copyToken() {
	const text = ui.apiTokenReveal;
	if (!text) return;
	try {
		await navigator.clipboard.writeText(text);
	}
	catch {
		const ta = document.createElement('textarea');
		ta.value = text;
		ta.style.position = 'fixed';
		ta.style.left = '-9999px';
		document.body.appendChild(ta);
		ta.select();
		document.execCommand('copy');
		document.body.removeChild(ta);
	}
	copied.value = true;
	if (copiedTimer) clearTimeout(copiedTimer);
	copiedTimer = setTimeout(() => { copied.value = false; }, 2000);
}

function closeReveal() {
	ui.apiTokenReveal = null;
	copied.value = false;
	if (copiedTimer) clearTimeout(copiedTimer);
	label.value = '';
	password.value = '';
	expires.value = 90;
	selectedScopes.value = [];
	error.value = '';
	ui.bumpApiTokensRevision();
}
</script>

<style scoped>
.scope-fieldset {
	margin: 0;
	padding: 0;
	border: none;
	display: grid;
	gap: .5rem;
}

.scope-fieldset legend {
	font-size: .78rem;
	font-weight: 700;
	text-transform: uppercase;
	letter-spacing: .04em;
	color: var(--muted);
	padding: 0;
	margin-bottom: .15rem;
}

.scope-options {
	display: grid;
	gap: .45rem;
}

.scope-option {
	display: flex;
	gap: .65rem;
	align-items: flex-start;
	padding: .65rem .75rem;
	border: 1px solid var(--line);
	border-radius: 8px;
	background: #fffaf2;
	cursor: pointer;
	transition: border-color .15s ease, background .15s ease;
}

.scope-option:hover {
	border-color: color-mix(in srgb, var(--accent) 35%, var(--line));
}

.scope-option.checked {
	border-color: var(--accent);
	background: color-mix(in srgb, var(--accent) 6%, #fffaf2);
}

.scope-option input {
	margin-top: .2rem;
	flex: none;
	accent-color: var(--accent);
}

.scope-option-body {
	display: grid;
	gap: .2rem;
	min-width: 0;
}

.scope-option-title {
	font-weight: 600;
	font-size: .92rem;
	line-height: 1.25;
}

.scope-option-desc {
	font-size: .82rem;
	line-height: 1.4;
	color: var(--muted);
}

.scope-option-path {
	font-size: .72rem;
	color: var(--ink);
	word-break: break-all;
}

.token-reveal-card {
	width: min(640px, 100%);
}

.token-reveal-warn {
	margin: 0 0 var(--space-md);
	padding: .75rem .85rem;
	border-radius: 8px;
	border: 1px solid #e0a89a;
	background: #fff0eb;
	color: #8f2f1a;
	font-size: .88rem;
	line-height: 1.5;
}

.token-reveal-row {
	display: flex;
	gap: .5rem;
	align-items: stretch;
	min-width: 0;
	margin-bottom: var(--space-md);
}

.token-reveal-code {
	flex: 1;
	min-width: 0;
	display: block;
	padding: .65rem .75rem;
	background: #f4f1ec;
	border: 1px solid var(--line);
	border-radius: 8px;
	font-size: .78rem;
	line-height: 1.35;
	white-space: nowrap;
	overflow-x: auto;
	overflow-y: hidden;
	-webkit-overflow-scrolling: touch;
}

.token-copy-btn {
	flex: none;
	align-self: stretch;
	padding-inline: .85rem;
	white-space: nowrap;
}
</style>
