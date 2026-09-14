import { onMounted, onUnmounted, type Ref } from 'vue';

export function useClickOutside(target: Ref<HTMLElement | null>, onOutside: () => void) {
	function handler(event: MouseEvent) {
		const el = target.value;
		if (!el || el.contains(event.target as Node)) return;
		onOutside();
	}

	onMounted(() => document.addEventListener('click', handler));
	onUnmounted(() => document.removeEventListener('click', handler));
}
