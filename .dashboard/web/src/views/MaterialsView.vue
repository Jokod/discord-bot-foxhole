<template>
  <PageShell
    :title="t('materials.title')"
    :subtitle="t('materials.sub')"
  >
    <template #actions>
      <div
        class="tool-group"
        role="group"
        :aria-label="t('materials.view')"
      >
        <button
          type="button"
          :class="{ active: materials.view === 'grid' }"
          @click="materials.view = 'grid'"
        >
          {{ t('materials.viewGrid') }}
        </button>
        <button
          type="button"
          :class="{ active: materials.view === 'table' }"
          @click="materials.view = 'table'"
        >
          {{ t('materials.viewTable') }}
        </button>
      </div>
    </template>

    <SectionPanel>
      <FilterBar variant="materials">
        <template #fields>
          <label class="field"><span>{{ t('guilds.search') }}</span><input
            v-model="materials.search"
            type="search"
            :placeholder="t('materials.searchPh')"
          ></label>
          <label class="field"><span>{{ t('materials.colCategory') }}</span>
            <select
              v-model="materials.category"
              @change="onCatChange"
            ><option value="all">{{ t('materials.all') }}</option><option
              v-for="c in materials.data?.categories || []"
              :key="c.id"
              :value="c.id"
            >{{ c.icon }} {{ labelCat(c.id) }}</option></select>
          </label>
          <label class="field"><span>{{ t('materials.colSubcategory') }}</span>
            <select v-model="materials.subcategory"><option value="all">{{ t('materials.all') }}</option><option
              v-for="s in subOptions"
              :key="s"
              :value="s"
            >{{ labelSub(s) }}</option></select>
          </label>
          <label class="field"><span>{{ t('materials.colFaction') }}</span>
            <select v-model="materials.faction"><option value="all">{{ t('materials.all') }}</option><option value="colonial">{{ t('materials.factionColonial') }}</option><option value="warden">{{ t('materials.factionWarden') }}</option><option value="both">{{ t('materials.factionBoth') }}</option></select>
          </label>
        </template>
        <template #actions>
          <button
            type="button"
            class="filter-action"
            @click="materials.load(true)"
          >
            {{ t('action.refresh') }}
          </button>
        </template>
      </FilterBar>

      <LoadingState
        v-if="materials.loading && !materials.data"
        overlay
        :message="t('materials.metaLoading')"
      />

      <template v-else>
      <p class="summary-bar">
        {{ metaText }}
      </p>

      <div
        v-if="materials.view === 'grid'"
        class="mat-grid"
      >
        <button
          v-for="m in materials.filtered"
          :key="m.itemName"
          type="button"
          class="mat-card"
          @click="ui.openMaterialDrawer(m)"
        >
          <div class="mat-card-icon">
            <img
              v-if="m.iconUrl"
              class="mat-icon"
              :src="m.iconUrl"
              alt=""
              loading="lazy"
              decoding="async"
            ><span
              v-else
              class="mat-icon-fallback"
            >{{ m.categoryIcon || '📦' }}</span>
          </div>
          <div class="mat-card-body">
            <strong class="mat-card-title">{{ m.itemName }}</strong>
            <p class="mat-card-desc muted">
              {{ (m.itemDesc || '').slice(0, 140) }}
            </p>
          </div>
        </button>
        <EmptyState
          v-if="!materials.filtered.length"
          :message="t('materials.empty')"
        />
      </div>

      <div
        v-else
        class="table-wrap"
      >
        <table>
          <thead>
            <tr>
              <th>{{ t('materials.colIcon') }}</th>
              <th>{{ t('materials.colName') }}</th>
              <th>{{ t('materials.colCategory') }}</th>
              <th>{{ t('materials.colSubcategory') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="m in materials.filtered"
              :key="m.itemName"
              class="row-click"
              @click="ui.openMaterialDrawer(m)"
            >
              <td class="mat-icon-cell">
                <img
                  v-if="m.iconUrl"
                  class="mat-icon"
                  :src="m.iconUrl"
                  alt=""
                  loading="lazy"
                  decoding="async"
                >
                <span
                  v-else
                  class="mat-icon-fallback"
                >{{ m.categoryIcon || '📦' }}</span>
              </td>
              <td><strong>{{ m.itemName }}</strong></td>
              <td>{{ labelCat(m.category) }}</td>
              <td>{{ labelSub(m.subcategory) }}</td>
            </tr>
            <tr v-if="!materials.filtered.length">
              <td
                colspan="4"
                class="empty-cell"
              >
                <EmptyState :message="t('materials.empty')" />
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      </template>
    </SectionPanel>
  </PageShell>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import EmptyState from '@/components/EmptyState.vue';
import FilterBar from '@/components/FilterBar.vue';
import LoadingState from '@/components/LoadingState.vue';
import PageShell from '@/components/PageShell.vue';
import SectionPanel from '@/components/SectionPanel.vue';
import { useMaterialsStore } from '@/stores/materials';
import { useUiStore } from '@/stores/ui';
import { useFormat } from '@/composables/useFormat';

const { t } = useI18n();
const materials = useMaterialsStore();
const ui = useUiStore();
const fmt = useFormat();

onMounted(() => materials.load(false));

function labelCat(id: string) { const k = `materials.cat.${id}`; const tr = t(k); return tr === k ? id : tr; }
function labelSub(id: string) { const k = `materials.sub.${id}`; const tr = t(k); return tr === k ? id : tr; }

const subOptions = computed(() => {
	const cats = materials.data?.categories || [];
	if (materials.category !== 'all') return cats.find((c) => c.id === materials.category)?.subcategories || [];
	const set = new Set<string>();
	cats.forEach((c) => (c.subcategories || []).forEach((s) => set.add(s)));
	return [...set].sort();
});

function onCatChange() { materials.subcategory = 'all'; }

const metaText = computed(() => {
	if (materials.loading) return t('materials.metaLoading');
	if (!materials.data) return t('materials.metaIdle');
	return t('materials.metaCount', { shown: fmt.n(materials.filtered.length), total: fmt.n(materials.data.items.length), icons: fmt.n(materials.data.icons?.with_icon ?? 0) });
});
</script>
