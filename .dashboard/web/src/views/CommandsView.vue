<template>
  <PageShell
    :title="t('commands.all')"
    :subtitle="t('commands.allSub')"
  >
    <LoadingState
      v-if="summary.loading && !summary.data"
      overlay
      :message="t('meta.loading')"
    />
    <template v-else>
      <SectionPanel>
        <p
          v-if="hiddenCount"
          class="summary-bar muted"
        >
          {{ t('commands.hiddenStale', { n: fmt.n(hiddenCount) }) }}
        </p>
        <div class="cmd-cloud">
          <span
            v-for="c in cmds"
            :key="c.name"
            class="chip"
          >
            /{{ c.name }} · {{ fmt.n(c.total) }}
          </span>
        </div>
        <ChartPanel
          type="bar"
          :data="barChart"
          :options="barOpts(true)"
          :empty="!cmds.length"
          size="lg"
        />
      </SectionPanel>
      <div class="grid grid-2 grid-commands">
        <SectionPanel
          :title="t('commands.share')"
          class="panel-chart"
        >
          <ChartPanel
            type="doughnut"
            :data="pieChart"
            :options="doughnutOpts()"
            :empty="!cmds.length"
            size="sm"
          />
        </SectionPanel>
        <SectionPanel :title="t('commands.detail')">
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th
                    v-for="col in cols"
                    :key="col.key"
                    :class="{ sorted: summary.cmdSortKey === col.key }"
                    @click="sort(col.key)"
                  >
                    {{ t(col.label) }} <span
                      v-if="summary.cmdSortKey === col.key"
                      class="arrow"
                    >{{ summary.cmdSortDir === 'asc' ? '▲' : '▼' }}</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="c in sorted"
                  :key="c.name"
                >
                  <td class="mono">
                    /{{ c.name }}
                  </td>
                  <td class="mono num">
                    {{ fmt.n(c.total) }}
                  </td>
                  <td class="mono num">
                    {{ fmt.pct(c.pct) }}
                  </td>
                  <td class="mono">
                    {{ c.last_used ? fmt.rel(c.last_used) : '—' }}
                  </td>
                </tr>
                <tr v-if="!sorted.length">
                  <td
                    colspan="4"
                    class="empty-cell"
                  >
                    <EmptyState :message="t('empty.noData')" />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </SectionPanel>
      </div>
    </template>
  </PageShell>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import ChartPanel from '@/components/ChartPanel.vue';
import EmptyState from '@/components/EmptyState.vue';
import LoadingState from '@/components/LoadingState.vue';
import PageShell from '@/components/PageShell.vue';
import SectionPanel from '@/components/SectionPanel.vue';
import { filterActiveCommands, hiddenCommandCount } from '@/lib/activeCommands';
import { useSummaryStore } from '@/stores/summary';
import { useFormat } from '@/composables/useFormat';
import { barOpts, doughnutOpts, palette } from '@/composables/useCharts';
import type { NamedCount } from '@/types';

const { t } = useI18n();
const summary = useSummaryStore();
const fmt = useFormat();

const allCmds = computed(() => summary.data?.commands || []);
const cmds = computed(() => filterActiveCommands(allCmds.value));
const hiddenCount = computed(() => hiddenCommandCount(allCmds.value));

const cols = [
	{ key: 'name' as const, label: 'commands.colName' },
	{ key: 'total' as const, label: 'commands.colTotal' },
	{ key: 'pct' as const, label: 'commands.share' },
	{ key: 'last_used' as const, label: 'commands.colLastUsed' },
];

const sorted = computed(() => [...cmds.value].sort((a, b) => {
	const key = summary.cmdSortKey;
	let av: unknown = key === 'last_used'
		? (a.last_used ? new Date(a.last_used).getTime() : 0)
		: a[key as keyof NamedCount];
	let bv: unknown = key === 'last_used'
		? (b.last_used ? new Date(b.last_used).getTime() : 0)
		: b[key as keyof NamedCount];
	if (typeof av === 'string') return summary.cmdSortDir === 'asc' ? av.localeCompare(String(bv)) : String(bv).localeCompare(av);
	return summary.cmdSortDir === 'asc' ? Number(av) - Number(bv) : Number(bv) - Number(av);
}));

function sort(key: 'name' | 'total' | 'pct' | 'last_used') {
	if (summary.cmdSortKey === key) summary.cmdSortDir = summary.cmdSortDir === 'asc' ? 'desc' : 'asc';
	else {
		summary.cmdSortKey = key;
		summary.cmdSortDir = key === 'name' ? 'asc' : 'desc';
	}
}

const barChart = computed(() => !cmds.value.length ? null : ({
	labels: cmds.value.map((c) => `/${c.name}`),
	datasets: [{ data: cmds.value.map((c) => c.total), backgroundColor: cmds.value.map((_, i) => palette[i % palette.length]), borderRadius: 6 }],
}));
const pieChart = computed(() => !cmds.value.length ? null : ({
	labels: cmds.value.map((c) => `/${c.name}`),
	datasets: [{ data: cmds.value.map((c) => c.total), backgroundColor: cmds.value.map((_, i) => palette[i % palette.length]) }],
}));
</script>
