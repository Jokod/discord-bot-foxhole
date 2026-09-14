<template>
  <ul class="discord-list">
    <li
      v-for="g in guilds"
      :key="g.guild_id"
      class="discord-card"
      :class="{ inactive: !g.active }"
    >
      <header class="discord-card-head">
        <div class="discord-card-title">
          <strong>{{ g.name }}</strong>
          <span
            class="badge"
            :class="g.active ? 'ok' : 'warn'"
          >{{ g.active ? t('contacts.active') : t('contacts.left') }}</span>
        </div>
        <div class="discord-card-recency mono">
          <span class="badge info">{{ fmt.activityLabel(g.activity || '') }}</span>
          <span>{{ fmt.rel(g.last_command_at) }}</span>
        </div>
      </header>

      <p class="discord-card-stats muted">
        {{ t('contacts.statsLine', {
          members: fmt.n(g.member_count),
          cmds: fmt.n(g.command_count),
          lang: g.lang || '—',
        }) }}
        <span
          v-if="g.joined_at"
          class="sep"
        >·</span>
        <span v-if="g.joined_at">{{ t('contacts.joined', { date: fmt.dt(g.joined_at) }) }}</span>
      </p>

      <div class="discord-card-team">
        <div class="discord-team-block">
          <span class="team-label">{{ t('contacts.ownerLabel') }}</span>
          <ContactPerson :user="g.owner" />
        </div>
        <div class="discord-team-block">
          <span class="team-label">{{ t('contacts.contributorsLabel') }}</span>
          <ul
            v-if="(g.creators || []).length"
            class="contributors-list"
          >
            <li
              v-for="c in (g.creators || []).slice(0, 5)"
              :key="c.user_id"
              class="contributor-item"
            >
              <ContactPerson
                :user="c"
                compact
              />
              <span
                v-if="creatorStats(c)"
                class="contributor-stats mono muted"
              >{{ creatorStats(c) }}</span>
            </li>
          </ul>
          <span
            v-else
            class="muted"
          >—</span>
        </div>
      </div>
    </li>
  </ul>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import ContactPerson from '@/components/ContactPerson.vue';
import { useFormat } from '@/composables/useFormat';
import type { ContactGuild } from '@/types';

defineProps<{ guilds: ContactGuild[] }>();

const { t } = useI18n();
const fmt = useFormat();

function creatorStats(c: NonNullable<ContactGuild['creators']>[number]) {
	if (!c) return '';
	const parts: string[] = [];
	if (c.stockpiles) parts.push(t('contacts.statStock', { n: c.stockpiles }));
	if (c.operations) parts.push(t('contacts.statOps', { n: c.operations }));
	if (c.boards) parts.push(t('contacts.statBoards', { n: c.boards }));
	if (c.lines) parts.push(t('contacts.statLines', { n: c.lines }));
	return parts.join(' · ');
}
</script>
