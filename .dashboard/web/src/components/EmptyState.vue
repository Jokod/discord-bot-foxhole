<template>
  <p class="empty-state">
    <slot>{{ message }}</slot>
  </p>
</template>

<script setup lang="ts">
defineProps<{ message?: string }>();
</script>
