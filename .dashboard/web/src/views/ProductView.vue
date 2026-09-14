<template>
  <PageShell :title="t('nav.product')">
    <LoadingState
      v-if="summary.loading && !summary.data"
      overlay
      :message="t('meta.loading')"
    />
    <template v-else>
    <div class="grid grid-3">
      <SectionPanel
        v-for="(chart, i) in charts"
        :key="i"
        :title="chart.title"
        :subtitle="chart.sub"
      >
        <ChartPanel
          :type="chart.type"
          :data="chart.data"
          :options="chart.options"
          :empty="chart.empty"
          :size="chart.size || 'sm'"
        />
      </SectionPanel>
    </div>
    <div class="grid grid-2">
      <SectionPanel :title="t('product.notifications')">
        <ChartPanel
          type="bar"
          :data="notifChart"
          :options="barOpts()"
          :empty="notifEmpty"
        />
      </SectionPanel>
      <SectionPanel :title="t('product.operations')">
        <ChartPanel
          type="bar"
          :data="opsChart"
          :options="barOpts()"
          :empty="opsEmpty"
        />
      </SectionPanel>
    </div>
    </template>
  </PageShell>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import ChartPanel from '@/components/ChartPanel.vue';
import LoadingState from '@/components/LoadingState.vue';
import PageShell from '@/components/PageShell.vue';
import SectionPanel from '@/components/SectionPanel.vue';
import { useSummaryStore } from '@/stores/summary';
import { useFormat } from '@/composables/useFormat';
import { barOpts, doughnutOpts, palette, series } from '@/composables/useCharts';

const { t } = useI18n();
const summary = useSummaryStore();
const fmt = useFormat();
const p = computed(() => summary.data?.product);

const kind = computed(() => series(p.value?.orderboards_by_kind));
const status = computed(() => series(p.value?.orderboards_by_status));
const prio = computed(() => series(p.value?.orderlines_by_priority));
const lang = computed(() => series(p.value?.servers_by_lang));
const camp = computed(() => series(p.value?.servers_by_camp));
const notif = computed(() => series(p.value?.notifications_by_type));
const ops = computed(() => series(p.value?.operations_by_status));

const prog = computed(() => p.value?.orderline_progress || {});
const lineHint = computed(() => t('product.lineHint', { done: fmt.n(prog.value.current || 0), target: fmt.n(prog.value.target || 0), pct: fmt.n(prog.value.pct || 0) }));
const remain = computed(() => Math.max(0, (prog.value.target || 0) - (prog.value.current || 0)));

const charts = computed(() => [
	{ title: t('product.boardKind'), type: 'doughnut' as const, data: kind.value.empty ? null : { labels: kind.value.labels, datasets: [{ data: kind.value.values, backgroundColor: kind.value.labels.map((_, i) => palette[i % palette.length]) }] }, options: doughnutOpts(), empty: kind.value.empty, size: 'sm' as const },
	{ title: t('product.boardStatus'), type: 'doughnut' as const, data: status.value.empty ? null : { labels: status.value.labels, datasets: [{ data: status.value.values, backgroundColor: ['#2f6b4f', '#9a6b12', '#b4451a', '#3d5a80'] }] }, options: doughnutOpts(), empty: status.value.empty, size: 'sm' as const },
	{ title: t('product.linePrio'), type: 'doughnut' as const, data: prio.value.empty ? null : { labels: prio.value.labels, datasets: [{ data: prio.value.values, backgroundColor: ['#b4451a', '#9a6b12', '#2f6b4f', '#3d5a80'] }] }, options: doughnutOpts(), empty: prio.value.empty, size: 'sm' as const },
	{ title: t('product.lineProgress'), sub: lineHint.value, type: 'doughnut' as const, data: !(prog.value.target || prog.value.current) ? null : { labels: [t('product.delivered'), t('product.remaining')], datasets: [{ data: [prog.value.current || 0, remain.value], backgroundColor: ['#2f6b4f', '#c9c1b2'] }] }, options: doughnutOpts(), empty: !(prog.value.target || prog.value.current), size: 'sm' as const },
	{ title: t('product.languages'), type: 'doughnut' as const, data: lang.value.empty ? null : { labels: lang.value.labels, datasets: [{ data: lang.value.values, backgroundColor: lang.value.labels.map((_, i) => palette[i % palette.length]) }] }, options: doughnutOpts(), empty: lang.value.empty, size: 'sm' as const },
	{ title: t('product.camps'), type: 'doughnut' as const, data: camp.value.empty ? null : { labels: camp.value.labels, datasets: [{ data: camp.value.values, backgroundColor: ['#2f6b4f', '#3d5a80', '#9a6b12'] }] }, options: doughnutOpts(), empty: camp.value.empty, size: 'sm' as const },
]);

const notifChart = computed(() => notif.value.empty ? null : ({ labels: notif.value.labels, datasets: [{ data: notif.value.values, backgroundColor: '#3d5a80', borderRadius: 6 }] }));
const notifEmpty = computed(() => notif.value.empty);
const opsChart = computed(() => ops.value.empty ? null : ({ labels: ops.value.labels, datasets: [{ data: ops.value.values, backgroundColor: '#b4451a', borderRadius: 6 }] }));
const opsEmpty = computed(() => ops.value.empty);
</script>
