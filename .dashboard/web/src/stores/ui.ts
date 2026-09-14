import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { Guild, MaterialItem } from '@/types';

export const useUiStore = defineStore('ui', () => {
	const drawerOpen = ref(false);
	const drawerKind = ref<'guild' | 'material'>('guild');
	const selectedGuild = ref<Guild | null>(null);
	const selectedMaterial = ref<MaterialItem | null>(null);
	const userMenuOpen = ref(false);

	const guildModal = ref<{ action: string; guild: Guild | null } | null>(null);
	const wikiConfirmOpen = ref(false);
	const apiTokenModalOpen = ref(false);
	const apiTokenReveal = ref<string | null>(null);
	/** Bumped when the token list should reload (after create/reveal close). */
	const apiTokensRevision = ref(0);

	function bumpApiTokensRevision() {
		apiTokensRevision.value += 1;
	}

	function openGuildDrawer(g: Guild) {
		selectedGuild.value = g;
		selectedMaterial.value = null;
		drawerKind.value = 'guild';
		drawerOpen.value = true;
	}

	function openMaterialDrawer(m: MaterialItem) {
		selectedMaterial.value = m;
		selectedGuild.value = null;
		drawerKind.value = 'material';
		drawerOpen.value = true;
	}

	function closeDrawer() {
		drawerOpen.value = false;
	}

	function clearDrawerSelection() {
		selectedGuild.value = null;
		selectedMaterial.value = null;
	}

	return {
		drawerOpen, drawerKind, selectedGuild, selectedMaterial, userMenuOpen,
		guildModal, wikiConfirmOpen, apiTokenModalOpen, apiTokenReveal, apiTokensRevision,
		openGuildDrawer, openMaterialDrawer, closeDrawer, clearDrawerSelection, bumpApiTokensRevision,
	};
});
