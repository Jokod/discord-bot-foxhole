<template>
  <div
    v-if="ui.wikiConfirmOpen"
    class="modal-backdrop"
    @click.self="ui.wikiConfirmOpen = false"
  >
    <div
      class="modal-card"
      role="dialog"
    >
      <h3>{{ t('materials.wikiSync.confirmTitle') }}</h3>
      <p class="sub">
        {{ t('materials.wikiSync.confirmSub') }}
      </p>
      <div class="modal-actions">
        <button
          type="button"
          @click="ui.wikiConfirmOpen = false"
        >
          {{ t('guilds.modalCancel') }}
        </button>
        <button
          type="button"
          class="danger"
          @click="confirm"
        >
          {{ t('materials.wikiSync.confirmOk') }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import { useUiStore } from '@/stores/ui';
import { useWikiSyncStore } from '@/stores/wikiSync';

const { t } = useI18n();
const ui = useUiStore();
const wiki = useWikiSyncStore();
function confirm() {
	ui.wikiConfirmOpen = false;
	wiki.start(false);
}
</script>
