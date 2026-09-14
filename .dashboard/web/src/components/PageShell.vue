<template>
  <section class="page">
    <header
      v-if="title || $slots.actions || subtitle"
      class="page-head"
    >
      <div class="page-head-text">
        <h1 v-if="title">
          {{ title }}
        </h1>
        <p
          v-if="subtitle"
          class="sub"
        >
          {{ subtitle }}
        </p>
        <p
          v-else-if="subtitleHtml"
          class="sub"
          v-html="subtitleHtml"
        />
      </div>
      <div
        v-if="$slots.actions"
        class="page-head-actions"
      >
        <slot name="actions" />
      </div>
    </header>
    <div class="page-content">
      <slot />
    </div>
  </section>
</template>

<script setup lang="ts">
defineProps<{
	title?: string;
	subtitle?: string;
	subtitleHtml?: string;
}>();
</script>
