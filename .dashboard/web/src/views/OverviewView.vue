<template>
  <PageShell :title="t('nav.overview')">
    <LoadingState
      v-if="summary.loading && !summary.data"
      overlay
      :message="t('meta.loading')"
    />
    <template v-else>
    <div class="grid grid-2">
      <SectionPanel
        :title="t('overview.activity')"
        :subtitle="t('overview.activitySub')"
      >
        <ChartPanel
          type="bar"
          :data="activityChart"
          :options="barOpts()"
          :empty="activityEmpty"
        />
      </SectionPanel>
      <SectionPanel
        :title="t('overview.joins')"
        :subtitle="t('overview.joinsSub')"
      >
        <ChartPanel
          type="line"
          :data="joinsChart"
          :options="lineChartOpts()"
        />
      </SectionPanel>
    </div>
    <div class="grid grid-3">
      <SectionPanel :title="t('overview.members')">
        <ChartPanel
          type="bar"
          :data="membersChart"
          :options="barOpts()"
          :empty="membersEmpty"
          size="sm"
        />
      </SectionPanel>
      <SectionPanel
        :title="t('overview.topCmds')"
        :subtitle="t('overview.topCmdsSub')"
      >
        <ChartPanel
          type="bar"
          :data="topCmdsMiniChart"
          :options="topCmdsMiniOpts"
          :empty="topCmdsMiniEmpty"
          size="sm"
        />
      </SectionPanel>
      <SectionPanel :title="t('overview.setup')">
        <ChartPanel
          type="doughnut"
          :data="setupChart"
          :options="doughnutOpts()"
          size="sm"
        />
      </SectionPanel>
    </div>
    <div class="grid grid-2">
      <SectionPanel :title="t('overview.topGuildsCmds')">
        <ChartPanel
          type="bar"
          :data="topCmdsChart"
          :options="barOpts(true)"
          :empty="!topCmds.length"
        />
      </SectionPanel>
      <SectionPanel :title="t('overview.topGuildsMembers')">
        <ChartPanel
          type="bar"
          :data="topMemChart"
          :options="barOpts(true)"
          :empty="!topMem.length"
        />
      </SectionPanel>
    </div>
    </template>
  </PageShell>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import ChartPanel from '@/components/ChartPanel.vue';
import LoadingState from '@/components/LoadingState.vue';
import PageShell from '@/components/PageShell.vue';
import SectionPanel from '@/components/SectionPanel.vue';
import { useSummaryStore } from '@/stores/summary';
import { barOpts, doughnutOpts, lineChartOpts, palette, series, useActivityBuckets } from '@/composables/useCharts';

const { t } = useI18n();
const summary = useSummaryStore();
const router = useRouter();
const localizeBuckets = useActivityBuckets();

const data = computed(() => summary.data);

const act = computed(() => series(localizeBuckets(data.value?.activity.buckets)));
const activityChart = computed(() => act.value.empty ? null : ({
	labels: act.value.labels,
	datasets: [{ data: act.value.values, backgroundColor: '#3d5a80', borderRadius: 6 }],
}));
const activityEmpty = computed(() => act.value.empty);

const joinsChart = computed(() => {
	const d = data.value;
	if (!d) return null;
	return {
		labels: d.activity.joins_by_month.map((m) => m.month),
		datasets: [
			{ label: t('chart.joins'), data: d.activity.joins_by_month.map((m) => m.count), borderColor: '#2f6b4f', backgroundColor: 'rgba(47,107,79,.12)', fill: true, tension: 0.3 },
			{ label: t('chart.leaves'), data: d.activity.leaves_by_month.map((m) => m.count), borderColor: '#b4451a', backgroundColor: 'rgba(180,69,26,.10)', fill: true, tension: 0.3 },
		],
	};
});

const mem = computed(() => series(data.value?.members.distribution));
const membersChart = computed(() => mem.value.empty ? null : ({ labels: mem.value.labels, datasets: [{ data: mem.value.values, backgroundColor: '#2f6b4f', borderRadius: 6 }] }));
const membersEmpty = computed(() => mem.value.empty);

const topCmdsMini = computed(() => (data.value?.commands || []).slice(0, 8));
const topCmdsMiniEmpty = computed(() => !topCmdsMini.value.length);
const topCmdsMiniChart = computed(() => topCmdsMiniEmpty.value ? null : ({
	labels: topCmdsMini.value.map((c) => `/${c.name}`),
	datasets: [{ data: topCmdsMini.value.map((c) => c.total), backgroundColor: topCmdsMini.value.map((_, i) => palette[i % palette.length]), borderRadius: 6 }],
}));
const topCmdsMiniOpts = computed(() => ({
	...barOpts(true),
	onClick: (_e: unknown, els: { index: number }[]) => {
		if (!els.length) return;
		const cmd = topCmdsMini.value[els[0].index]?.name;
		if (!cmd) return;
		summary.filters.command = cmd;
		router.push({ name: 'guilds' });
	},
}));

const setupChart = computed(() => {
	const k = data.value?.kpis;
	if (!k) return null;
	return {
		labels: [t('chart.setup'), t('chart.noSetup'), t('chart.engaged7d'), t('chart.inactive7d')],
		datasets: [{ data: [k.setup_servers, k.pending_setup, k.engaged_7d, Math.max(0, k.active_guilds - k.engaged_7d)], backgroundColor: ['#2f6b4f', '#9a6b12', '#3d5a80', '#c9c1b2'] }],
	};
});

const topCmds = computed(() => data.value?.top.by_commands.slice(0, 10) || []);
const topCmdsChart = computed(() => !topCmds.value.length ? null : ({
	labels: topCmds.value.map((g) => g.name.slice(0, 22)),
	datasets: [{ data: topCmds.value.map((g) => g.command_count), backgroundColor: '#b4451a', borderRadius: 6 }],
}));

const topMem = computed(() => data.value?.top.by_members.slice(0, 10) || []);
const topMemChart = computed(() => !topMem.value.length ? null : ({
	labels: topMem.value.map((g) => g.name.slice(0, 22)),
	datasets: [{ data: topMem.value.map((g) => g.member_count), backgroundColor: '#2f6b4f', borderRadius: 6 }],
}));
</script>
