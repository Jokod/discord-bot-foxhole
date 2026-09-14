<template>
  <div v-if="guild">
    <h3>{{ guild.name }}</h3>
    <p class="mono muted">
      {{ guild.guild_id }}
    </p>
    <div class="stat-list">
      <div><span>{{ t('drawer.setup') }}</span><strong>{{ guild.setup ? t('yes') : t('no') }}</strong></div>
      <div><span>{{ t('drawer.members') }}</span><strong>{{ fmt.n(guild.member_count) }}</strong></div>
      <div><span>{{ t('drawer.commands') }}</span><strong>{{ fmt.n(guild.command_count) }}</strong></div>
      <div><span>{{ t('drawer.lastCmd') }}</span><strong>{{ fmt.dt(guild.last_command_at) }}</strong></div>
    </div>
    <div class="chips">
      <span
        v-for="c in guild.top_commands || []"
        :key="c.name"
        class="chip"
      >/{{ c.name }} {{ c.count }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import { useFormat } from '@/composables/useFormat';
import type { Guild } from '@/types';
defineProps<{ guild: Guild }>();
const { t } = useI18n();
const fmt = useFormat();
</script>
