import { describe, expect, it, vi, beforeEach } from 'vitest';
import GuildModal from './GuildModal.vue';
import { mountWithPlugins } from '@/test/mount';
import { useUiStore } from '@/stores/ui';
import type { Guild } from '@/types';

vi.mock('@/api/client', () => ({
	api: vi.fn(),
}));

vi.mock('@/stores/summary', () => ({
	useSummaryStore: () => ({
		load: vi.fn().mockResolvedValue(undefined),
	}),
}));

import { api } from '@/api/client';

const guild: Guild = {
	guild_id: 'g1',
	name: 'Alpha',
	setup: true,
	member_count: 10,
	command_count: 2,
	operation_count: 0,
	stock_board_count: 0,
};

describe('GuildModal', () => {
	beforeEach(() => {
		vi.mocked(api).mockReset();
	});

	it('ne rend rien sans modal', () => {
		const { wrapper } = mountWithPlugins(GuildModal);
		expect(wrapper.find('.modal-backdrop').exists()).toBe(false);
	});

	it('ouvre leave, exige CONFIRM, puis soumet', async () => {
		vi.mocked(api).mockResolvedValue({
			results: [{ status: 'ok', name: 'Alpha', guild_id: 'g1' }],
		});
		const { wrapper } = mountWithPlugins(GuildModal);
		const ui = useUiStore();
		ui.guildModal = { action: 'leave', guild };

		await wrapper.vm.$nextTick();
		expect(wrapper.find('[role="dialog"]').exists()).toBe(true);
		expect(wrapper.text()).toContain('Alpha');

		await wrapper.get('button.danger').trigger('click');
		expect(wrapper.find('.error').exists()).toBe(true);

		await wrapper.get('input').setValue('CONFIRM');
		await wrapper.get('button.danger').trigger('click');
		await vi.waitFor(() => expect(api).toHaveBeenCalled());
		expect(vi.mocked(api).mock.calls[0][0]).toBe('/api/guilds/leave');
		expect(wrapper.find('pre').text()).toContain('OK');
	});

	it('broadcast avec dry-run', async () => {
		vi.mocked(api).mockResolvedValue({ results: [] });
		const { wrapper } = mountWithPlugins(GuildModal);
		const ui = useUiStore();
		ui.guildModal = { action: 'broadcast', guild };
		await wrapper.vm.$nextTick();

		await wrapper.get('textarea').setValue('Hello');
		const buttons = wrapper.findAll('.modal-actions button');
		await buttons[1].trigger('click');
		await vi.waitFor(() => expect(api).toHaveBeenCalled());
		const body = JSON.parse(String(vi.mocked(api).mock.calls[0][1]?.body));
		expect(body.message).toBe('Hello');
		expect(body.dry_run).toBe(true);
	});

	it('ferme via cancel', async () => {
		const { wrapper } = mountWithPlugins(GuildModal);
		const ui = useUiStore();
		ui.guildModal = { action: 'blacklist', guild };
		await wrapper.vm.$nextTick();
		await wrapper.get('.modal-actions button').trigger('click');
		expect(ui.guildModal).toBeNull();
	});
});
