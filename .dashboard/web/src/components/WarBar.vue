<template>
  <section
    v-if="war?.available && war.warNumber != null"
    class="war-bar"
    :class="warClasses"
  >
    <header class="war-head">
      <div class="war-head-main">
        <p class="war-title">
          {{ ended ? t('war.titleEnded') : t('war.worldConquest', { n: fmt.n(war.warNumber) }) }}
        </p>
        <span
          v-if="!ended"
          class="war-live-elapsed mono"
        >{{ elapsedText }}</span>
        <span
          v-else
          class="war-num"
        >#{{ fmt.n(war.warNumber) }}</span>
        <span
          class="war-status"
          :class="statusClass"
        >{{ t(winnerKey) }}</span>
      </div>
      <div
        v-if="war.playersOnline != null"
        class="war-players"
      >
        <span class="label">{{ t('war.players') }}</span>
        <span class="value">{{ fmt.n(war.playersOnline) }}</span>
      </div>
    </header>
    <div
      v-if="showEnds"
      class="war-ends"
    >
      <span class="label">{{ t('war.ends') }}</span>
      <span class="value mono">{{ endsText }}</span>
    </div>
    <div
      v-if="ended && timers.elapsed?.days != null"
      class="war-ends"
    >
      <span class="label">{{ t('war.elapsed') }}</span>
      <span class="value mono">{{ elapsedText }}</span>
    </div>
    <div
      v-if="war.victoryTowns"
      class="war-score"
      role="group"
      :aria-label="t('war.towns')"
    >
      <div
        class="war-faction war-faction--colonial"
        :class="{ 'is-winner': winner === 'COLONIAL' }"
      >
        <div class="war-faction-top">
          <span class="war-faction-name">{{ t('war.winnerColonial') }}</span>
          <span class="war-faction-score">{{ colScore }}</span>
        </div>
        <div
          class="war-track"
          aria-hidden="true"
        >
          <span
            class="war-fill"
            :style="{ width: pct(col) + '%' }"
          />
        </div>
      </div>
      <div
        class="war-score-vs"
        aria-hidden="true"
      >
        {{ t('war.vs') }}
      </div>
      <div
        class="war-faction war-faction--warden"
        :class="{ 'is-winner': winner === 'WARDEN' }"
      >
        <div class="war-faction-top">
          <span class="war-faction-name">{{ t('war.winnerWarden') }}</span>
          <span class="war-faction-score">{{ wardScore }}</span>
        </div>
        <div
          class="war-track"
          aria-hidden="true"
        >
          <span
            class="war-fill"
            :style="{ width: pct(ward) + '%' }"
          />
        </div>
      </div>
    </div>
    <p
      v-if="scorched > 0"
      class="war-scorched"
    >
      {{ t('war.scorchedTowns') }}: <strong>{{ fmt.n(scorched) }}</strong>
    </p>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useFormat } from '@/composables/useFormat';
import { computeWarTimers, formatEndsLine, formatLiveDuration } from '@/composables/useWar';
import type { WarData } from '@/types';

const props = defineProps<{ war?: WarData }>();
const { t } = useI18n();
const fmt = useFormat();
const tick = ref(0);
let timer: ReturnType<typeof setInterval> | null = null;

const timers = computed(() => computeWarTimers(props.war || { available: false }, Date.now()));
const ended = computed(() => timers.value.ended);
const winner = computed(() => {
	const w = props.war?.winner;
	return w && w !== 'NONE' ? w : null;
});
const winnerKey = computed(() => {
	if (props.war?.winner === 'WARDEN') return 'war.winnerWarden';
	if (props.war?.winner === 'COLONIAL') return 'war.winnerColonial';
	if (ended.value) return 'war.ended';
	return 'war.winnerNone';
});
const statusClass = computed(() => {
	if (ended.value) {
		if (winner.value === 'WARDEN') return 'war-status--warden';
		if (winner.value === 'COLONIAL') return 'war-status--colonial';
		return 'war-status--ended';
	}
	return 'war-status--live';
});
const warClasses = computed(() => ({
	'war-bar--ended': ended.value,
	'war-bar--live': !ended.value,
	'war-bar--warden': winner.value === 'WARDEN',
	'war-bar--colonial': winner.value === 'COLONIAL',
}));
const need = computed(() => props.war?.effectiveRequiredVictoryTowns ?? props.war?.requiredVictoryTowns);
const col = computed(() => Number(props.war?.victoryTowns?.colonial) || 0);
const ward = computed(() => Number(props.war?.victoryTowns?.warden) || 0);
const scorched = computed(() => Number(props.war?.victoryTowns?.scorched) || 0);
const pct = (n: number) => (need.value && need.value > 0 ? Math.min(100, Math.round((n / need.value) * 100)) : 0);
const colScore = computed(() => need.value != null ? `${fmt.n(col.value)} / ${fmt.n(need.value)}` : fmt.n(col.value));
const wardScore = computed(() => need.value != null ? `${fmt.n(ward.value)} / ${fmt.n(need.value)}` : fmt.n(ward.value));
const elapsedText = computed(() => {
	void tick.value;
	return formatLiveDuration(timers.value.elapsed, t);
});
const showEnds = computed(() => !ended.value && timers.value.remaining);
const endsText = computed(() => {
	void tick.value;
	if (!timers.value.remaining) return '';
	return formatEndsLine(timers.value.remaining, timers.value.vp, t, fmt.n);
});

watch(() => props.war?.available, (ok) => {
	if (timer) clearInterval(timer);
	timer = ok ? setInterval(() => { tick.value++; }, 1000) : null;
}, { immediate: true });

onMounted(() => {
	if (props.war?.available) timer = setInterval(() => { tick.value++; }, 1000);
});
onUnmounted(() => { if (timer) clearInterval(timer); });
</script>
