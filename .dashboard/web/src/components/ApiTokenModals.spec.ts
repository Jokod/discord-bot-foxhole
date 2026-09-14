import { describe, expect, it, vi, beforeEach } from 'vitest';
import ApiTokenModals from './ApiTokenModals.vue';
import { mountWithPlugins } from '@/test/mount';
import { useUiStore } from '@/stores/ui';
import { useAuthStore } from '@/stores/auth';

vi.mock('@/api/client', () => ({
	api: vi.fn(),
	setUnauthorizedHandler: vi.fn(),
}));

import { api } from '@/api/client';

describe('ApiTokenModals', () => {
	beforeEach(() => {
		vi.mocked(api).mockReset();
	});

	it('ne rend rien par défaut', () => {
		const { wrapper } = mountWithPlugins(ApiTokenModals);
		expect(wrapper.find('.modal-backdrop').exists()).toBe(false);
	});

	it('affiche les scopes autorisés et crée un token', async () => {
		vi.mocked(api).mockResolvedValue({ token: 'secret-token' });
		const { wrapper } = mountWithPlugins(ApiTokenModals);
		const auth = useAuthStore();
		auth.user = {
			authenticated: true,
			username: 'admin',
			isDefault: false,
			api: { enabled: true, scopes: ['materials', 'data'] },
		};
		const ui = useUiStore();
		ui.apiTokenModalOpen = true;
		await wrapper.vm.$nextTick();

		expect(wrapper.findAll('.scope-option')).toHaveLength(2);
		const inputs = wrapper.findAll('.modal-card input');
		await inputs[0].setValue('My token');
		await inputs[1].setValue('pass');
		await wrapper.findAll('.modal-actions button')[1].trigger('click');
		await vi.waitFor(() => expect(ui.apiTokenReveal).toBe('secret-token'));
		expect(ui.apiTokenModalOpen).toBe(false);
		expect(wrapper.find('.token-reveal-code').text()).toBe('secret-token');
	});

	it('ferme le reveal et bump la révision', async () => {
		const { wrapper } = mountWithPlugins(ApiTokenModals);
		const ui = useUiStore();
		ui.apiTokenReveal = 'tok';
		await wrapper.vm.$nextTick();
		const before = ui.apiTokensRevision;
		await wrapper.findAll('button').at(-1)!.trigger('click');
		expect(ui.apiTokenReveal).toBeNull();
		expect(ui.apiTokensRevision).toBe(before + 1);
	});
});
