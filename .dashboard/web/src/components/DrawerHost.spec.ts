import { describe, expect, it } from 'vitest';
import DrawerHost from './DrawerHost.vue';
import { mountWithPlugins } from '@/test/mount';
import { useUiStore } from '@/stores/ui';
import type { Guild, MaterialItem } from '@/types';

const guild: Guild = {
	guild_id: 'g1',
	name: 'Alpha',
	setup: true,
	member_count: 10,
	command_count: 2,
	operation_count: 0,
	stock_board_count: 0,
};

const material: MaterialItem = {
	itemName: 'Rifle',
	itemDesc: 'A rifle',
	category: 'Small Arms',
	subcategory: 'Rifles',
	wikiUrl: 'https://wiki.example/Rifle',
};

describe('DrawerHost', () => {
	it('ne rend rien quand fermé', () => {
		const { wrapper } = mountWithPlugins(DrawerHost, {
			global: {
				stubs: {
					GuildDrawerBody: true,
					MaterialDrawerBody: true,
				},
			},
		});
		expect(wrapper.find('.drawer').exists()).toBe(false);
	});

	it('ouvre un drawer guild avec actions', async () => {
		const { wrapper } = mountWithPlugins(DrawerHost, {
			global: {
				stubs: {
					GuildDrawerBody: { template: '<div data-test="guild-body" />' },
					MaterialDrawerBody: true,
				},
			},
		});
		const ui = useUiStore();
		ui.openGuildDrawer(guild);
		await wrapper.vm.$nextTick();

		expect(wrapper.find('[data-test="guild-body"]').exists()).toBe(true);
		expect(wrapper.find('.drawer-guild-actions').exists()).toBe(true);

		await wrapper.get('button.danger').trigger('click');
		expect(ui.guildModal).toEqual({ action: 'leave', guild });
	});

	it('montre unblacklist si blocked mongo', async () => {
		const { wrapper } = mountWithPlugins(DrawerHost, {
			global: {
				stubs: {
					GuildDrawerBody: true,
					MaterialDrawerBody: true,
				},
			},
		});
		const ui = useUiStore();
		ui.openGuildDrawer({ ...guild, blocked: true, blocked_source: 'mongo' });
		await wrapper.vm.$nextTick();
		expect(wrapper.text()).toMatch(/unblacklist|Unblacklist|retirer|Retirer/i);
	});

	it('ouvre un drawer material', async () => {
		const { wrapper } = mountWithPlugins(DrawerHost, {
			global: {
				stubs: {
					GuildDrawerBody: true,
					MaterialDrawerBody: { template: '<div data-test="mat-body" />' },
				},
			},
		});
		const ui = useUiStore();
		ui.openMaterialDrawer(material);
		await wrapper.vm.$nextTick();
		expect(wrapper.find('[data-test="mat-body"]').exists()).toBe(true);
		expect(wrapper.find('.drawer-guild-actions').exists()).toBe(false);

		await wrapper.get('.backdrop').trigger('click');
		expect(ui.drawerOpen).toBe(false);
	});
});
