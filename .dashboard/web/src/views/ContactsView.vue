<template>
  <PageShell
    :title="t('contacts.title')"
    :subtitle-html="metaHtml"
  >
    <SectionPanel>
      <FilterBar variant="contacts">
        <template #fields>
          <label class="field"><span>{{ t('guilds.search') }}</span><input
            v-model="contacts.search"
            type="search"
            :placeholder="t('contacts.searchPh')"
          ></label>
          <label class="field"><span>{{ t('contacts.view') }}</span>
            <select v-model="contacts.view"><option value="guilds">{{ t('contacts.byGuild') }}</option><option value="people">{{ t('contacts.byPerson') }}</option></select>
          </label>
        </template>
        <template #actions>
          <button
            type="button"
            class="filter-action"
            :disabled="contacts.loading"
            @click="contacts.load(true)"
          >
            {{ t('contacts.reload') }}
          </button>
        </template>
      </FilterBar>

      <div class="loading-host contacts-results">
        <LoadingState
          v-if="contacts.loading"
          overlay
          :message="t('contacts.metaLoading')"
        />

        <DiscordGuildList
          v-if="contacts.view === 'guilds' && filteredGuilds.length"
          :guilds="filteredGuilds"
        />
        <DiscordPeopleList
          v-else-if="contacts.view === 'people' && filteredPeople.length"
          :people="filteredPeople"
        />
        <EmptyState
          v-else-if="!contacts.loading"
          :message="contacts.view === 'guilds' ? t('contacts.emptyGuilds') : t('contacts.emptyPeople')"
        />
      </div>
    </SectionPanel>
  </PageShell>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import DiscordGuildList from '@/components/DiscordGuildList.vue';
import DiscordPeopleList from '@/components/DiscordPeopleList.vue';
import EmptyState from '@/components/EmptyState.vue';
import FilterBar from '@/components/FilterBar.vue';
import LoadingState from '@/components/LoadingState.vue';
import PageShell from '@/components/PageShell.vue';
import SectionPanel from '@/components/SectionPanel.vue';
import { useContactsStore } from '@/stores/contacts';
import { useFormat } from '@/composables/useFormat';
import { sortGuildsByRecency, sortPeopleByRecency } from '@/lib/contactSort';

const { t } = useI18n();
const contacts = useContactsStore();
const fmt = useFormat();

onMounted(() => contacts.load(false));

const metaHtml = computed(() => {
	if (contacts.loading) return t('contacts.metaLoading');
	if (!contacts.data) return t('contacts.metaIdle');
	const k = contacts.data.kpis;
	if (!contacts.data.discord_token) return `<span class="error">${t('contacts.noToken')}</span>`;
	return `${fmt.n(k.active_guilds)} ${t('contacts.active')} · ${fmt.n(k.left_guilds)} ${t('contacts.left')} · ${fmt.n(k.unique_people)} ${t('contacts.peopleShort')} · ${fmt.dt(contacts.data.generated_at)}`;
});

const q = computed(() => contacts.search.trim().toLowerCase());
const filteredGuilds = computed(() => sortGuildsByRecency((contacts.data?.guilds || []).filter((g) => {
	if (!q.value) return true;
	const blob = [
		g.name, g.guild_id, g.lang,
		g.active ? t('contacts.active') : t('contacts.left'),
		g.owner?.display_name, g.owner?.username, g.owner?.user_id,
		...(g.creators || []).flatMap((c) => [c.display_name, c.username, c.user_id]),
	].filter(Boolean).join(' ').toLowerCase();
	return blob.includes(q.value);
})));
const filteredPeople = computed(() => sortPeopleByRecency((contacts.data?.people || []).filter((p) => {
	if (!q.value) return true;
	const blob = [p.display_name, p.username, p.user_id].filter(Boolean).join(' ').toLowerCase();
	return blob.includes(q.value);
})));
</script>
