import { afterEach, describe, expect, it, vi } from 'vitest';
import WarBar from './WarBar.vue';
import { mountWithPlugins } from '@/test/mount';
import type { WarData } from '@/types';

afterEach(() => {
	vi.useRealTimers();
});

describe('WarBar', () => {
	it('ne rend rien si war indisponible', () => {
		const { wrapper } = mountWithPlugins(WarBar, {
			props: { war: { available: false } },
		});
		expect(wrapper.find('.war-bar').exists()).toBe(false);
	});

	it('affiche une guerre live', () => {
		vi.useFakeTimers();
		const now = Date.now();
		const war: WarData = {
			available: true,
			warNumber: 120,
			ended: false,
			winner: 'NONE',
			conquestStartTime: now - 3_600_000,
			scheduledConquestEndTime: now + 86_400_000,
			playersOnline: 2500,
			requiredVictoryTowns: 32,
			victoryTowns: { colonial: 10, warden: 12, scorched: 1 },
		};
		const { wrapper } = mountWithPlugins(WarBar, { props: { war } });
		expect(wrapper.find('.war-bar').classes()).toContain('war-bar--live');
		expect(wrapper.find('.war-players .value').text()).toContain('2');
		expect(wrapper.find('.war-scorched').exists()).toBe(true);
		wrapper.unmount();
	});

	it('affiche une guerre terminée avec vainqueur', () => {
		const now = Date.now();
		const war: WarData = {
			available: true,
			warNumber: 119,
			ended: true,
			winner: 'WARDEN',
			conquestStartTime: now - 10_000_000,
			conquestEndTime: now - 1_000,
			victoryTowns: { colonial: 20, warden: 32 },
			effectiveRequiredVictoryTowns: 32,
		};
		const { wrapper } = mountWithPlugins(WarBar, { props: { war } });
		expect(wrapper.find('.war-bar').classes()).toContain('war-bar--ended');
		expect(wrapper.find('.war-bar').classes()).toContain('war-bar--warden');
		expect(wrapper.find('.war-faction--warden').classes()).toContain('is-winner');
		wrapper.unmount();
	});
});
