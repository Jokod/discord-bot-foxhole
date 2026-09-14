import { defineStore } from 'pinia';
import { ref } from 'vue';
import { api } from '@/api/client';
import type { SummaryPayload } from '@/types';

export const useSummaryStore = defineStore('summary', () => {
	const data = ref<SummaryPayload | null>(null);
	const loading = ref(false);
	const error = ref<string | null>(null);
	const autoRefresh = ref(true);
	let timer: ReturnType<typeof setInterval> | null = null;

	const filters = ref({
		search: '',
		setup: 'all',
		activity: 'all',
		minCmds: 0,
		command: '',
		leftSearch: '',
		leftSort: 'left_at',
	});

	const sortKey = ref<keyof SummaryPayload['guilds'][0] | 'setup'>('last_command_at');
	const sortDir = ref<'asc' | 'desc'>('desc');
	const cmdSortKey = ref<'name' | 'total' | 'pct' | 'last_used'>('total');
	const cmdSortDir = ref<'asc' | 'desc'>('desc');

	async function load(silent = false) {
		if (!silent) loading.value = true;
		error.value = null;
		try {
			data.value = await api<SummaryPayload>('/api/summary');
		}
		catch (err) {
			error.value = err instanceof Error ? err.message : String(err);
			throw err;
		}
		finally {
			loading.value = false;
		}
	}

	function scheduleAuto(enabled: boolean, isDefault: boolean) {
		if (timer) clearInterval(timer);
		timer = null;
		if (enabled && !isDefault) {
			timer = setInterval(() => load(true), 60000);
		}
	}

	function stopAuto() {
		if (timer) clearInterval(timer);
		timer = null;
	}

	return {
		data, loading, error, autoRefresh, filters,
		sortKey, sortDir, cmdSortKey, cmdSortDir,
		load, scheduleAuto, stopAuto,
	};
});
