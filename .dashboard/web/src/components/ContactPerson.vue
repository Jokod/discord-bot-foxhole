<template>
  <span
    v-if="!user?.user_id"
    class="muted"
  >—</span>
  <div
    v-else
    class="person"
    :class="{ compact }"
  >
    <img
      v-if="user.avatar_url"
      :src="user.avatar_url"
      alt=""
      width="28"
      height="28"
      loading="lazy"
      decoding="async"
    >
    <div class="who">
      <strong><a
        :href="user.profile_url"
        target="_blank"
        rel="noopener"
      >{{ user.display_name || user.username || user.user_id }}</a></strong>
      <span
        v-if="user.username"
        class="mono muted"
      >@{{ user.username }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ContactUser } from '@/types';

withDefaults(defineProps<{ user?: ContactUser | null; compact?: boolean }>(), { compact: false });
</script>
