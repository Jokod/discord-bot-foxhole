'use strict';

const {
	collectKnownChannels,
	listRestCandidateChannels,
} = require('../../utils/announceChannels');

describe('announceChannels', () => {
	it('collects unique preferred channel ids from db docs', () => {
		const ids = collectKnownChannels({
			notifs: [{ guild_id: 'g1', channel_id: 'c1' }, { guild_id: 'g2', channel_id: 'x' }],
			tracked: [{ server_id: 'g1', channel_id: 'c2' }],
			boards: [{ guild_id: 'g1', channel_id: 'c1' }],
			stockpiles: [{ server_id: 'g1', channel_id: null, group_id: 'c3' }],
			operations: [{ guild_id: 'g1', channel_id: 'c4' }],
		}, 'g1');
		expect(ids).toEqual(['c1', 'c2', 'c3', 'c4']);
	});

	it('orders rest candidates: db, system, then text by position', () => {
		const channels = [
			{ id: 't2', name: 'general', type: 0, position: 2 },
			{ id: 'db1', name: 'ops', type: 0, position: 5 },
			{ id: 'sys', name: 'system', type: 0, position: 0 },
			{ id: 'voice', name: 'voice', type: 2, position: 1 },
			{ id: 't1', name: 'welcome', type: 0, position: 1 },
		];
		const out = listRestCandidateChannels(
			channels,
			{ system_channel_id: 'sys' },
			['db1', 'missing'],
		);
		expect(out.map((c) => `${c.channel_id}:${c.source}`)).toEqual([
			'db1:db',
			'sys:system',
			't1:first-text',
			't2:first-text',
		]);
	});
});
