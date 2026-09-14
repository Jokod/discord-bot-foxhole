import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { api } from '@/api/client';
import type { MaterialItem, MaterialsPayload } from '@/types';

function factionKey(factions: string[] | undefined) {
	const set = new Set(factions || []);
	const hasC = set.has('colonial');
	const hasW = set.has('warden');
	if (hasC && hasW) return 'both';
	if (hasC) return 'colonial';
	if (hasW) return 'warden';
	return 'none';
}

export const useMaterialsStore = defineStore('materials', () => {
	const data = ref<MaterialsPayload | null>(null);
	const loading = ref(false);
	const search = ref('');
	const category = ref('all');
	const subcategory = ref('all');
	const faction = ref('all');
	const sort = ref('name');
	const sortDir = ref<'asc' | 'desc'>('asc');
	const view = ref<'grid' | 'table'>('grid');

	async function load(force = false) {
		if (data.value && !force) return;
		loading.value = true;
		try {
			data.value = await api<MaterialsPayload>('/api/materials');
		}
		finally {
			loading.value = false;
		}
	}

	const filtered = computed(() => {
		const items = data.value?.items || [];
		const q = search.value.trim().toLowerCase();
		let list = items.filter((m) => {
			if (category.value !== 'all' && m.category !== category.value) return false;
			if (subcategory.value !== 'all' && m.subcategory !== subcategory.value) return false;
			if (faction.value !== 'all') {
				const fk = factionKey(m.faction);
				if (faction.value === 'both' && fk !== 'both') return false;
				if (faction.value === 'colonial' && fk !== 'colonial') return false;
				if (faction.value === 'warden' && fk !== 'warden') return false;
			}
			if (q) {
				const blob = `${m.itemName} ${m.itemDesc} ${m.category} ${m.subcategory} ${m.itemCategory}`.toLowerCase();
				if (!blob.includes(q)) return false;
			}
			return true;
		});
		const dir = sortDir.value === 'desc' ? -1 : 1;
		list = list.slice().sort((a, b) => {
			let cmp: number;
			if (sort.value === 'category') {
				cmp = a.category.localeCompare(b.category) || a.subcategory.localeCompare(b.subcategory) || a.itemName.localeCompare(b.itemName);
			}
			else if (sort.value === 'subcategory') {
				cmp = a.subcategory.localeCompare(b.subcategory) || a.itemName.localeCompare(b.itemName);
			}
			else {
				cmp = a.itemName.localeCompare(b.itemName);
			}
			return cmp * dir;
		});
		return list;
	});

	function findByName(name: string): MaterialItem | null {
		return (data.value?.items || []).find((m) => m.itemName === name) || null;
	}

	return {
		data, loading, search, category, subcategory, faction, sort, sortDir, view,
		filtered, load, findByName, factionKey,
	};
});
