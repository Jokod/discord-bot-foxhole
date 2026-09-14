import { defineStore } from 'pinia';
import { ref } from 'vue';
import { api } from '@/api/client';
import type { ContactsPayload } from '@/types';

export const useContactsStore = defineStore('contacts', () => {
	const data = ref<ContactsPayload | null>(null);
	const loading = ref(false);
	const search = ref('');
	const view = ref<'guilds' | 'people'>('guilds');

	async function load(force = false) {
		if (data.value && !force) return;
		loading.value = true;
		try {
			data.value = await api<ContactsPayload>(`/api/contacts${force ? '?force=1' : ''}`);
		}
		finally {
			loading.value = false;
		}
	}

	return { data, loading, search, view, load };
});
