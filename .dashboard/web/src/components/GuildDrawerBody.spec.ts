import { describe, expect, it } from 'vitest';
import GuildDrawerBody from './GuildDrawerBody.vue';
import { mountWithPlugins } from '@/test/mount';
import type { Guild } from '@/types';

const guild: Guild = {
	guild_id: 'g1',
	name: 'Alpha',
	setup: true,
	member_count: 42,
	command_count: 7,
	operation_count: 0,
	stock_board_count: 0,
	last_command_at: '2024-06-01T12:00:00.000Z',
	top_commands: [{ name: 'help', count: 3 }, { name: 'stockpile', count: 2 }],
};

describe('GuildDrawerBody', () => {
	it('affiche stats et top commands', () => {
		const { wrapper } = mountWithPlugins(GuildDrawerBody, { props: { guild } });
		expect(wrapper.get('h3').text()).toBe('Alpha');
		expect(wrapper.text()).toContain('g1');
		expect(wrapper.text()).toContain('/help 3');
		expect(wrapper.text()).toContain('/stockpile 2');
	});
});
