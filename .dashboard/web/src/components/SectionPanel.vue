<template>
  <article
    class="panel"
    v-bind="$attrs"
  >
    <header
      v-if="title || $slots.actions || subtitle"
      class="section-panel-head"
    >
      <div>
        <h2 v-if="title">
          {{ title }}
          <span
            v-if="count != null"
            class="muted"
          >({{ count }})</span>
        </h2>
        <p
          v-if="subtitle"
          class="sub"
        >
          {{ subtitle }}
        </p>
      </div>
      <div
        v-if="$slots.actions"
        class="page-head-actions"
      >
        <slot name="actions" />
      </div>
    </header>
    <slot />
  </article>
</template>

<script setup lang="ts">
defineOptions({ inheritAttrs: false });

defineProps<{
	title?: string;
	subtitle?: string;
	count?: string | number;
}>();
</script>
