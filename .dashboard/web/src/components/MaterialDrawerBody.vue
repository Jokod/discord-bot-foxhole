<template>
  <div>
    <div class="mat-drawer-head">
      <img
        v-if="item.iconUrl"
        class="mat-icon"
        :src="item.iconUrl"
        alt=""
      >
      <div><h3>{{ item.itemName }}</h3></div>
    </div>
    <p class="mat-drawer-desc">
      {{ item.itemDesc }}
    </p>
    <p>
      <a
        :href="item.wikiUrl"
        target="_blank"
        rel="noopener"
      >{{ t('materials.wikiLink') }}</a>
    </p>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import type { MaterialItem } from '@/types';
defineProps<{ item: MaterialItem }>();
const { t } = useI18n();
</script>
