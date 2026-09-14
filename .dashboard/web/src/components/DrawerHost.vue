<template>
  <Transition name="drawer-backdrop">
    <div
      v-if="ui.drawerOpen"
      class="backdrop"
      @click="ui.closeDrawer()"
    />
  </Transition>
  <Transition
    name="drawer-panel"
    @after-leave="ui.clearDrawerSelection()"
  >
    <aside
      v-if="ui.drawerOpen"
      class="drawer"
      aria-hidden="false"
    >
      <div class="drawer-header">
        <strong>{{ drawerTitle }}</strong>
        <button
          type="button"
          @click="ui.closeDrawer()"
        >
          {{ t('drawer.close') }}
        </button>
      </div>
      <GuildDrawerBody
        v-if="ui.drawerKind === 'guild' && ui.selectedGuild"
        :guild="ui.selectedGuild"
      />
      <MaterialDrawerBody
        v-else-if="ui.drawerKind === 'material' && ui.selectedMaterial"
        :item="ui.selectedMaterial"
      />
      <div
        v-if="ui.drawerKind === 'guild' && ui.selectedGuild"
        class="drawer-guild-actions"
      >
        <h4 class="drawer-actions-title">
          {{ t('drawer.actions') }}
        </h4>
        <div class="guild-action-row">
          <div class="guild-action-copy">
            <strong>{{ t('guilds.actLeave') }}</strong>
            <p class="guild-action-hint">
              {{ t('guilds.actLeaveHint') }}
            </p>
          </div>
          <button
            type="button"
            class="danger"
            @click="openModal('leave')"
          >
            {{ t('guilds.actLeave') }}
          </button>
        </div>
        <div
          v-if="!blocked"
          class="guild-action-row"
        >
          <div class="guild-action-copy">
            <strong>{{ t('guilds.actBlacklist') }}</strong>
            <p class="guild-action-hint">
              {{ t('guilds.actBlacklistHint') }}
            </p>
          </div>
          <button
            type="button"
            class="danger"
            @click="openModal('blacklist')"
          >
            {{ t('guilds.actBlacklist') }}
          </button>
        </div>
        <div
          v-if="blocked && canUnblacklist"
          class="guild-action-row"
        >
          <div class="guild-action-copy">
            <strong>{{ t('guilds.actUnblacklist') }}</strong>
            <p class="guild-action-hint">
              {{ t('guilds.actUnblacklistHint') }}
            </p>
          </div>
          <button
            type="button"
            @click="openModal('unblacklist')"
          >
            {{ t('guilds.actUnblacklist') }}
          </button>
        </div>
        <div class="guild-action-row">
          <div class="guild-action-copy">
            <strong>{{ t('guilds.actBroadcast') }}</strong>
            <p class="guild-action-hint">
              {{ t('guilds.actBroadcastHint') }}
            </p>
          </div>
          <button
            type="button"
            @click="openModal('broadcast')"
          >
            {{ t('guilds.actBroadcast') }}
          </button>
        </div>
      </div>
    </aside>
  </Transition>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import GuildDrawerBody from '@/components/GuildDrawerBody.vue';
import MaterialDrawerBody from '@/components/MaterialDrawerBody.vue';
import { useUiStore } from '@/stores/ui';

const { t } = useI18n();
const ui = useUiStore();
const drawerTitle = computed(() => ui.drawerKind === 'material' ? t('materials.drawerTitle') : t('drawer.title'));
const blocked = computed(() => Boolean(ui.selectedGuild?.blocked || ui.selectedGuild?.blocked_source));
const canUnblacklist = computed(() => {
	const s = ui.selectedGuild?.blocked_source;
	return s === 'mongo' || s === 'both';
});
function openModal(action: string) {
	if (!ui.selectedGuild) return;
	ui.guildModal = { action, guild: ui.selectedGuild };
}
</script>
