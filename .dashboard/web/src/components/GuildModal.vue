<template>
  <div
    v-if="modal"
    class="modal-backdrop"
    @click.self="close"
  >
    <div
      class="modal-card"
      role="dialog"
    >
      <h3>{{ title }}</h3>
      <p class="sub">
        {{ hint }}
      </p>
      <ul id="guildModalList">
        <li><strong>{{ modal.guild?.name }}</strong><br><span class="mono muted">{{ modal.guild?.guild_id }}</span></li>
      </ul>
      <label
        v-if="needsConfirm"
        class="field"
      ><span>{{ t('guilds.confirmLabel') }}</span><input v-model="confirmText"></label>
      <template v-if="modal.action === 'broadcast'">
        <label class="field"><span>{{ t('guilds.broadcastMsg') }}</span><textarea
          v-model="message"
          rows="4"
        /></label>
        <label class="check-row"><input
          v-model="dryRun"
          type="checkbox"
        ><span>{{ t('guilds.broadcastDry') }}</span></label>
      </template>
      <p
        v-if="error"
        class="error"
      >
        {{ error }}
      </p>
      <pre
        v-if="report"
        class="wiki-sync-log"
      >{{ report }}</pre>
      <div class="modal-actions">
        <button
          type="button"
          @click="close"
        >
          {{ t('guilds.modalCancel') }}
        </button>
        <button
          type="button"
          :class="{ danger: modal.action !== 'broadcast' }"
          @click="submit"
        >
          {{ submitLabel }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { api } from '@/api/client';
import { useSummaryStore } from '@/stores/summary';
import { useUiStore } from '@/stores/ui';

const { t } = useI18n();
const ui = useUiStore();
const summary = useSummaryStore();
const modal = computed(() => ui.guildModal);
const confirmText = ref('');
const message = ref('');
const dryRun = ref(true);
const error = ref('');
const report = ref('');

const needsConfirm = computed(() => ['leave', 'blacklist', 'unblacklist'].includes(modal.value?.action || ''));
const title = computed(() => {
	const m: Record<string, string> = { leave: 'guilds.modalLeaveTitle', blacklist: 'guilds.modalBlacklistTitle', unblacklist: 'guilds.modalUnblacklistTitle', broadcast: 'guilds.modalBroadcastTitle' };
	return t(m[modal.value?.action || ''] || 'guilds.modalSub');
});
const hints: Record<string, string> = {
	leave: 'guilds.actLeaveHint',
	blacklist: 'guilds.actBlacklistHint',
	unblacklist: 'guilds.actUnblacklistHint',
	broadcast: 'guilds.actBroadcastHint',
};
const hint = computed(() => t(hints[modal.value?.action || ''] || 'guilds.modalSub'));
const submitLabel = computed(() => modal.value?.action === 'broadcast' ? t('guilds.modalSubmitBroadcast') : t('guilds.modalConfirm'));

function close() {
	ui.guildModal = null;
	confirmText.value = '';
	message.value = '';
	error.value = '';
	report.value = '';
}

async function submit() {
	if (!modal.value?.guild) return;
	error.value = '';
	if (needsConfirm.value && confirmText.value.trim() !== 'CONFIRM') {
		error.value = t('guilds.confirmNeeded');
		return;
	}
	const action = modal.value.action;
	const body: Record<string, unknown> = { guild_ids: [modal.value.guild.guild_id] };
	if (action === 'broadcast') Object.assign(body, { message: message.value, dry_run: dryRun.value });
	try {
		const data = await api<{ results: { status: string; name?: string; guild_id: string; detail?: string }[] }>(`/api/guilds/${action}`, { method: 'POST', body: JSON.stringify(body) });
		report.value = (data.results || []).map((r) => `${r.status.toUpperCase().padEnd(4)} ${r.name || r.guild_id} ${r.detail || ''}`).join('\n');
		await summary.load(true);
	}
	catch (err) {
		error.value = err instanceof Error ? err.message : t('error.generic', { msg: 'failed' });
	}
}
</script>
