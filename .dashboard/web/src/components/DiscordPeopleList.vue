<template>
  <ul class="discord-list">
    <li
      v-for="p in people"
      :key="p.user_id"
      class="discord-card"
    >
      <header class="discord-card-head">
        <ContactPerson :user="p" />
        <span class="mono muted">{{ t('contacts.serversCount', { n: p.guilds?.length || 0 }) }}</span>
      </header>
      <div
        v-if="(p.roles || []).length"
        class="contact-roles"
      >
        <span
          v-for="r in p.roles"
          :key="r"
          class="badge info"
        >{{ r }}</span>
      </div>
      <div
        v-if="(p.guilds || []).length"
        class="chips"
      >
        <span
          v-for="g in p.guilds"
          :key="g.guild_id"
          class="chip"
          :class="{ muted: g.active === false }"
        >{{ g.name.slice(0, 28) }}</span>
      </div>
    </li>
  </ul>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import ContactPerson from '@/components/ContactPerson.vue';
import type { ContactPerson as ContactPersonType } from '@/types';

defineProps<{ people: ContactPersonType[] }>();
const { t } = useI18n();
</script>
