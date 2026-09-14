<template>
  <div
    class="loading-state"
    :class="{ inline, overlay }"
    role="status"
    :aria-label="message || t('meta.loading')"
  >
    <span
      class="spinner"
      aria-hidden="true"
    />
    <span
      v-if="message"
      class="loading-msg"
    >{{ message }}</span>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n';

withDefaults(defineProps<{
	message?: string;
	inline?: boolean;
	overlay?: boolean;
}>(), {
	inline: false,
	overlay: false,
});

const { t } = useI18n();
</script>
