'use strict';

const mockToArray = jest.fn();
const mockProject = jest.fn(() => ({ toArray: mockToArray }));
const mockFind = jest.fn(() => ({ project: mockProject }));
const mockCollection = jest.fn(() => ({ find: mockFind }));

jest.mock('mongoose', () => ({
	connection: {
		db: {
			collection: (...args) => mockCollection(...args),
		},
	},
}));

const {
	collectKnownChannels,
	loadAnnounceChannelDocs,
	listRestCandidateChannels,
	listDiscordJsCandidateChannels,
} = require('../../utils/announceChannels');

describe('announceChannels', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		mockToArray.mockResolvedValue([]);
	});

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

	it('collectKnownChannels ignore ids falsy et autres guilds', () => {
		expect(collectKnownChannels({}, 'g1')).toEqual([]);
		expect(collectKnownChannels({
			notifs: [{ guild_id: 'g1', channel_id: '' }],
			stockpiles: [{ server_id: 'g1', channel_id: 'c1' }],
		}, 'g1')).toEqual(['c1']);
	});

	it('collectKnownChannels ignore entrées pour autres guilds', () => {
		const ids = collectKnownChannels({
			notifs: [{ guild_id: 'g2', channel_id: 'n1' }],
			tracked: [{ server_id: 'g2', channel_id: 't1' }],
			boards: [{ guild_id: 'g2', channel_id: 'b1' }],
			stockpiles: [{ server_id: 'g2', channel_id: 's1' }],
			operations: [{ guild_id: 'g2', channel_id: 'o1' }],
		}, 'g1');
		expect(ids).toEqual([]);
	});

	it('listRestCandidateChannels gère channels null et types non texte', () => {
		const out = listRestCandidateChannels(null, {}, ['missing']);
		expect(out).toEqual([]);
		const out2 = listRestCandidateChannels(
			[{ id: 'v1', type: 2, name: 'voice' }],
			{},
			[],
		);
		expect(out2).toEqual([]);
	});

	it('listRestCandidateChannels ignore doublons et types non texte', () => {
		const out = listRestCandidateChannels(
			[
				{ id: 'db1', name: 'ops', type: 0 },
				{ id: 'voice', name: 'voice', type: 2 },
				{ id: 'ann', name: 'news', type: 5 },
			],
			null,
			['db1', 'db1', 'missing'],
		);
		expect(out.map((c) => c.channel_id)).toEqual(['db1', 'ann']);
		expect(out[0].source).toBe('db');
	});

	it('listRestCandidateChannels ignore preferredIds null et type non texte', () => {
		const out = listRestCandidateChannels(
			[{ id: 'voice', name: 'voice', type: 2 }],
			null,
			null,
		);
		expect(out).toEqual([]);
		const out2 = listRestCandidateChannels(
			[{ id: 'voice', name: 'voice', type: 2 }],
			null,
			['voice'],
		);
		expect(out2).toEqual([]);
	});

	it('listRestCandidateChannels utilise id si name absent', () => {
		const out = listRestCandidateChannels([{ id: 'x1', type: 0 }], null, []);
		expect(out[0].name).toBe('x1');
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

	describe('loadAnnounceChannelDocs', () => {
		it('retourne vide sans db ou sans guild ids', async () => {
			const mongoose = require('mongoose');
			const savedDb = mongoose.connection.db;
			mongoose.connection.db = null;
			await expect(loadAnnounceChannelDocs(['g1'])).resolves.toEqual({
				notifs: [], tracked: [], boards: [], stockpiles: [], operations: [],
			});
			mongoose.connection.db = savedDb;

			await expect(loadAnnounceChannelDocs([])).resolves.toEqual({
				notifs: [], tracked: [], boards: [], stockpiles: [], operations: [],
			});
			expect(mockCollection).not.toHaveBeenCalled();
		});

		it('interroge les collections Mongo pour les guild ids', async () => {
			mockToArray
				.mockResolvedValueOnce([{ guild_id: 'g1', channel_id: 'n1' }])
				.mockResolvedValueOnce([{ server_id: 'g1', channel_id: 't1' }])
				.mockResolvedValueOnce([{ guild_id: 'g1', channel_id: 'b1' }])
				.mockResolvedValueOnce([{ server_id: 'g1', group_id: 's1' }])
				.mockResolvedValueOnce([{ guild_id: 'g1', channel_id: 'o1' }]);

			const docs = await loadAnnounceChannelDocs(['g1', 'g2']);

			expect(mockCollection).toHaveBeenCalledWith('notificationsubscriptions');
			expect(mockCollection).toHaveBeenCalledWith('trackedmessages');
			expect(mockCollection).toHaveBeenCalledWith('orderboards');
			expect(mockCollection).toHaveBeenCalledWith('stockpiles');
			expect(mockCollection).toHaveBeenCalledWith('operations');
			expect(mockFind).toHaveBeenCalledWith({ guild_id: { $in: ['g1', 'g2'] } });
			expect(mockFind).toHaveBeenCalledWith({ server_id: { $in: ['g1', 'g2'] } });
			expect(docs).toEqual({
				notifs: [{ guild_id: 'g1', channel_id: 'n1' }],
				tracked: [{ server_id: 'g1', channel_id: 't1' }],
				boards: [{ guild_id: 'g1', channel_id: 'b1' }],
				stockpiles: [{ server_id: 'g1', group_id: 's1' }],
				operations: [{ guild_id: 'g1', channel_id: 'o1' }],
			});
		});
	});

	describe('listDiscordJsCandidateChannels', () => {
		const ChannelType = { GuildText: 0, GuildAnnouncement: 5 };

		const ch = (id, type, rawPosition, extra = {}) => ({
			id,
			type,
			rawPosition,
			name: id,
			...extra,
		});

		it('ordonne preferred, systemChannel, puis GuildText triés', () => {
			const preferred = ch('db1', ChannelType.GuildText, 5);
			const system = ch('sys', ChannelType.GuildText, 0);
			const textLate = ch('t2', ChannelType.GuildText, 2);
			const textEarly = ch('t1', ChannelType.GuildText, 1);
			const voice = ch('voice', 2, 0);
			const guild = {
				systemChannelId: 'sys',
				members: { me: { id: 'bot' } },
				channels: {
					cache: new Map([
						['db1', preferred],
						['sys', system],
						['t1', textEarly],
						['t2', textLate],
						['voice', voice],
					]),
				},
			};
			const canSend = () => true;

			const out = listDiscordJsCandidateChannels(guild, ['db1', 'missing'], canSend, ChannelType);

			expect(out.map(({ channel, source }) => `${channel.id}:${source}`)).toEqual([
				'db1:db',
				'sys:system',
				't1:first-text',
				't2:first-text',
			]);
		});

		it('ignore canaux non sendable et doublons', () => {
			const preferred = ch('db1', ChannelType.GuildText, 1);
			const text = ch('t1', ChannelType.GuildText, 2);
			const ann = ch('ann', ChannelType.GuildAnnouncement, 0);
			const guild = {
				systemChannelId: null,
				members: { me: { id: 'bot' } },
				channels: {
					cache: new Map([
						['db1', preferred],
						['t1', text],
						['ann', ann],
					]),
				},
			};
			const canSend = (channel) => channel.id !== 'missing';

			const out = listDiscordJsCandidateChannels(guild, ['db1', 'db1', 'missing'], canSend, ChannelType);

			expect(out.map(({ channel }) => channel.id)).toEqual(['db1', 'ann', 't1']);
		});
	});
});
