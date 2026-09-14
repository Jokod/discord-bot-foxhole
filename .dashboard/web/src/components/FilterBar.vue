<template>
  <div
    class="filter-bar"
    :class="variantClass"
  >
    <slot name="fields" />
    <div
      v-if="$slots.actions"
      class="filter-bar-actions"
    >
      <slot name="actions" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = withDefaults(defineProps<{
	variant?: 'default' | 'contacts' | 'materials' | 'guilds' | 'compact';
}>(), {
	variant: 'default',
});

const variantClass = computed(() => {
	if (props.variant === 'contacts') return 'filters-contacts';
	if (props.variant === 'materials') return 'filters-materials';
	if (props.variant === 'guilds') return 'filters-guilds';
	if (props.variant === 'compact') return 'filters-compact';
	return '';
});
</script>
