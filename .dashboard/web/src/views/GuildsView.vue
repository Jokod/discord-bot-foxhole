<template>
  <PageShell :title="t('guilds.active')">
    <LoadingState
      v-if="summary.loading && !summary.data"
      overlay
      :message="t('meta.loading')"
    />
    <template v-else>
    <SectionPanel>
      <FilterBar variant="guilds">
        <template #fields>
          <label class="field"><span>{{ t('guilds.search') }}</span><input
            v-model="summary.filters.search"
            type="search"
          ></label>
          <label class="field"><span>{{ t('guilds.setup') }}</span>
            <select v-model="summary.filters.setup"><option value="all">{{ t('guilds.all') }}</option><option value="yes">{{ t('yes') }}</option><option value="no">{{ t('no') }}</option></select>
          </label>
          <label class="field"><span>{{ t('guilds.activity') }}</span>
            <select v-model="summary.filters.activity"><option value="all">{{ t('guilds.all') }}</option><option
              v-for="a in activityOpts"
              :key="a"
              :value="a"
            >{{ fmt.activityLabel(a) }}</option></select>
          </label>
          <label class="field"><span>{{ t('guilds.minCmds') }}</span><input
            v-model.number="summary.filters.minCmds"
            type="number"
            min="0"
          ></label>
          <label class="field"><span>{{ t('guilds.command') }}</span>
            <select v-model="summary.filters.command"><option value="">{{ t('guilds.commandAll') }}</option><option
              v-for="c in summary.data?.commands || []"
              :key="c.name"
              :value="c.name"
            >/{{ c.name }} ({{ fmt.n(c.total) }})</option></select>
          </label>
        </template>
        <template #actions>
          <button
            type="button"
            class="filter-action"
            @click="reset"
          >
            {{ t('guilds.reset') }}
          </button>
        </template>
      </FilterBar>
      <p class="summary-bar">
        {{ t('guilds.count', { n: fmt.n(guilds.length), total: fmt.n(summary.data?.guilds.length || 0) }) }}
        <span
          v-if="summary.filters.command"
          class="badge info"
        >{{ t('guilds.filterCmd', { cmd: summary.filters.command }) }}</span>
      </p>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th
                v-for="col in sortCols"
                :key="col.key"
                :class="{ sorted: summary.sortKey === col.key }"
                @click="sort(col.key)"
              >
                {{ t(col.label) }}<span
                  v-if="summary.sortKey === col.key"
                  class="arrow"
                >{{ summary.sortDir === 'asc' ? '▲' : '▼' }}</span>
              </th>
              <th>{{ t('guilds.colTop') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="g in guilds"
              :key="g.guild_id"
              class="row-click"
              @click="ui.openGuildDrawer(g)"
            >
              <td>
                <span
                  v-if="g.blocked"
                  class="badge blocked"
                >{{ t('guilds.blocked') }}</span> <strong>{{ g.name }}</strong><br><span class="mono muted">{{ g.guild_id }}</span>
              </td>
              <td>
                <span
                  class="badge"
                  :class="g.setup ? 'ok' : 'warn'"
                >{{ g.setup ? t('yes') : t('no') }}</span>
              </td>
              <td class="mono">
                {{ g.lang || '—' }}
              </td>
              <td class="mono num">
                {{ fmt.n(g.command_count) }}
              </td>
              <td class="mono num">
                {{ fmt.n(g.member_count) }}
              </td>
              <td class="mono num">
                {{ fmt.n(g.operation_count) }}
              </td>
              <td class="mono num">
                {{ fmt.n(g.stock_board_count) }}
              </td>
              <td class="mono">
                <span class="badge info">{{ fmt.activityLabel(g.activity || '') }}</span> {{ fmt.rel(g.last_command_at) }}
              </td>
              <td>
                <div class="chips">
                  <span
                    v-for="c in (g.top_commands || []).slice(0, 3)"
                    :key="c.name"
                    class="chip"
                    :class="{ active: summary.filters.command === c.name }"
                    @click.stop="summary.filters.command = c.name"
                  >/{{ c.name }} {{ c.count }}</span>
                </div>
              </td>
            </tr>
            <tr v-if="!guilds.length">
              <td
                colspan="9"
                class="empty-cell"
              >
                <EmptyState :message="t('guilds.empty')" />
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </SectionPanel>

    <SectionPanel
      :title="t('guilds.blockedTitle')"
      :subtitle="t('guilds.blockedSub')"
      :count="fmt.n(blocked.length)"
    >
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>{{ t('guilds.colServer') }}</th>
              <th>{{ t('guilds.colSource') }}</th>
              <th>{{ t('guilds.colStatus') }}</th>
              <th>{{ t('guilds.colAction') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="g in blocked"
              :key="g.guild_id"
            >
              <td><strong>{{ g.name }}</strong><br><span class="mono muted">{{ g.guild_id }}</span></td>
              <td><span class="badge blocked">{{ g.source }}</span></td>
              <td>{{ blockedStatus(g) }}</td>
              <td>
                <button
                  v-if="g.can_unblacklist"
                  type="button"
                  @click="openUnblacklist(g)"
                >
                  {{ t('guilds.actUnblacklist') }}
                </button><span
                  v-else
                  class="muted"
                >{{ t('guilds.unblacklistEnvOnly') }}</span>
              </td>
            </tr>
            <tr v-if="!blocked.length">
              <td
                colspan="4"
                class="empty-cell"
              >
                <EmptyState :message="t('guilds.emptyBlocked')" />
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </SectionPanel>

    <SectionPanel :title="t('guilds.leftTitle')">
      <FilterBar variant="compact">
        <template #fields>
          <label class="field"><span>{{ t('guilds.search') }}</span><input
            v-model="summary.filters.leftSearch"
            type="search"
          ></label>
        </template>
      </FilterBar>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>{{ t('guilds.colServer') }}</th>
              <th>{{ t('guilds.colCmds') }}</th>
              <th>{{ t('guilds.leftAt') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="g in leftGuilds"
              :key="g.guild_id"
            >
              <td><strong>{{ g.name }}</strong><br><span class="mono muted">{{ g.guild_id }}</span></td>
              <td class="mono num">
                {{ fmt.n(g.command_count) }}
              </td>
              <td class="mono">
                {{ fmt.dt(g.left_at) }}
              </td>
            </tr>
            <tr v-if="!leftGuilds.length">
              <td
                colspan="3"
                class="empty-cell"
              >
                <EmptyState :message="t('guilds.emptyLeft')" />
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </SectionPanel>
    </template>
  </PageShell>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import EmptyState from '@/components/EmptyState.vue';
import FilterBar from '@/components/FilterBar.vue';
import LoadingState from '@/components/LoadingState.vue';
import PageShell from '@/components/PageShell.vue';
import SectionPanel from '@/components/SectionPanel.vue';
import { useSummaryStore } from '@/stores/summary';
import { useUiStore } from '@/stores/ui';
import { useFormat } from '@/composables/useFormat';
import type { BlockedGuild, Guild } from '@/types';

const { t } = useI18n();
const summary = useSummaryStore();
const ui = useUiStore();
const fmt = useFormat();

const activityOpts = ['24h', '7d', '30d', '90d', 'older', 'never'];
const sortCols = [
	{ key: 'name', label: 'guilds.colServer' },
	{ key: 'setup', label: 'guilds.colSetup' },
	{ key: 'lang', label: 'guilds.colLang' },
	{ key: 'command_count', label: 'guilds.colCmds' },
	{ key: 'member_count', label: 'guilds.colMembers' },
	{ key: 'operation_count', label: 'guilds.colOps' },
	{ key: 'stock_board_count', label: 'guilds.colStocks' },
	{ key: 'last_command_at', label: 'guilds.colRecency' },
];

const guilds = computed(() => {
	const raw = summary.data;
	if (!raw) return [];
	const q = summary.filters.search.trim().toLowerCase();
	return raw.guilds.filter((g) => {
		if (summary.filters.setup === 'yes' && !g.setup) return false;
		if (summary.filters.setup === 'no' && g.setup) return false;
		if (summary.filters.activity !== 'all' && g.activity !== summary.filters.activity) return false;
		if ((g.command_count || 0) < summary.filters.minCmds) return false;
		if (summary.filters.command && !((g.command_breakdown?.[summary.filters.command] ?? 0) > 0)) return false;
		if (q && !(`${g.name} ${g.guild_id}`).toLowerCase().includes(q)) return false;
		return true;
	}).sort((a, b) => sortGuild(a, b));
});

function sortGuild(a: Guild, b: Guild) {
	let av: unknown = a[summary.sortKey as keyof Guild];
	let bv: unknown = b[summary.sortKey as keyof Guild];
	if (summary.sortKey === 'setup') { av = a.setup ? 1 : 0; bv = b.setup ? 1 : 0; }
	if (summary.sortKey === 'lang') { av = a.lang || ''; bv = b.lang || ''; }
	if (summary.sortKey === 'last_command_at' || summary.sortKey === 'joined_at') {
		av = av ? new Date(String(av)).getTime() : 0;
		bv = bv ? new Date(String(bv)).getTime() : 0;
	}
	if (typeof av === 'string') return summary.sortDir === 'asc' ? av.localeCompare(String(bv)) : String(bv).localeCompare(av);
	return summary.sortDir === 'asc' ? Number(av) - Number(bv) : Number(bv) - Number(av);
}

function sort(key: string) {
	if (summary.sortKey === key) summary.sortDir = summary.sortDir === 'asc' ? 'desc' : 'asc';
	else { summary.sortKey = key as typeof summary.sortKey; summary.sortDir = key === 'name' ? 'asc' : 'desc'; }
}

function reset() {
	summary.filters.search = '';
	summary.filters.setup = 'all';
	summary.filters.activity = 'all';
	summary.filters.minCmds = 0;
	summary.filters.command = '';
}

const blocked = computed(() => summary.data?.blocked_guilds || []);
const leftGuilds = computed(() => {
	const lq = summary.filters.leftSearch.trim().toLowerCase();
	return [...(summary.data?.left_guilds || [])]
		.filter((g) => !lq || (`${g.name} ${g.guild_id}`).toLowerCase().includes(lq))
		.sort((a, b) => new Date(b.left_at || 0).getTime() - new Date(a.left_at || 0).getTime());
});

function blockedStatus(g: BlockedGuild) {
	if (g.active) return t('guilds.blockedStillIn');
	if (g.left_at) return t('guilds.blockedLeft');
	return t('guilds.blockedUnknown');
}

function openUnblacklist(g: BlockedGuild) {
	ui.guildModal = { action: 'unblacklist', guild: { guild_id: g.guild_id, name: g.name, blocked: true, blocked_source: g.source, setup: false, member_count: 0, command_count: 0, operation_count: 0, stock_board_count: 0 } };
}
</script>
