<template>
  <div
    class="chart-box"
    :class="sizeClass"
  >
    <Line
      v-if="type === 'line' && !empty && data"
      :data="data as ChartData<'line'>"
      :options="(options || {}) as ChartOptions<'line'>"
    />
    <Bar
      v-else-if="type === 'bar' && !empty && data"
      :data="data as ChartData<'bar'>"
      :options="(options || {}) as ChartOptions<'bar'>"
    />
    <Doughnut
      v-else-if="type === 'doughnut' && !empty && data"
      :data="data as ChartData<'doughnut'>"
      :options="(options || {}) as ChartOptions<'doughnut'>"
    />
    <div
      v-show="empty"
      class="chart-empty"
    >
      {{ emptyLabel }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { Bar, Line, Doughnut } from 'vue-chartjs';
import type { ChartData, ChartOptions } from 'chart.js';
import { useI18n } from 'vue-i18n';

const props = withDefaults(defineProps<{
	type: 'bar' | 'line' | 'doughnut';
	data: ChartData<'bar' | 'line' | 'doughnut'> | null;
	options?: ChartOptions<'bar' | 'line' | 'doughnut'>;
	empty?: boolean;
	size?: 'default' | 'sm' | 'lg';
}>(), {
	empty: false,
	size: 'default',
});

const { t } = useI18n();
const emptyLabel = computed(() => t('empty.noData'));
const sizeClass = computed(() => (props.size === 'sm' ? 'sm' : props.size === 'lg' ? 'lg' : ''));
</script>
