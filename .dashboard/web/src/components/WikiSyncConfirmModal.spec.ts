import { describe, expect, it, vi } from 'vitest';
import WikiSyncConfirmModal from './WikiSyncConfirmModal.vue';
import { mountWithPlugins } from '@/test/mount';
import { useUiStore } from '@/stores/ui';

const start = vi.fn();

vi.mock('@/stores/wikiSync', () => ({
	useWikiSyncStore: () => ({ start }),
}));

describe('WikiSyncConfirmModal', () => {
	it('ne rend rien quand fermé', () => {
		const { wrapper } = mountWithPlugins(WikiSyncConfirmModal);
		expect(wrapper.find('.modal-backdrop').exists()).toBe(false);
	});

	it('confirme et lance wiki.start(false)', async () => {
		start.mockClear();
		const { wrapper } = mountWithPlugins(WikiSyncConfirmModal);
		const ui = useUiStore();
		ui.wikiConfirmOpen = true;
		await wrapper.vm.$nextTick();

		expect(wrapper.find('[role="dialog"]').exists()).toBe(true);
		await wrapper.get('button.danger').trigger('click');
		expect(ui.wikiConfirmOpen).toBe(false);
		expect(start).toHaveBeenCalledWith(false);
	});

	it('annule sans lancer sync', async () => {
		start.mockClear();
		const { wrapper } = mountWithPlugins(WikiSyncConfirmModal);
		const ui = useUiStore();
		ui.wikiConfirmOpen = true;
		await wrapper.vm.$nextTick();
		await wrapper.get('.modal-actions button').trigger('click');
		expect(ui.wikiConfirmOpen).toBe(false);
		expect(start).not.toHaveBeenCalled();
	});
});
