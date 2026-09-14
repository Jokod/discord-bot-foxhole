const mockTranslate = jest.fn((key) => key);

jest.mock('../../utils/translations.js', () => jest.fn().mockImplementation(() => ({ translate: mockTranslate })));

const mockBuildStockpileListPayload = jest.fn();

jest.mock('../../interactions/embeds/stockpileList.js', () => ({
	buildStockpileListPayload: (...args) => mockBuildStockpileListPayload(...args),
}));

const mockStockpileFind = jest.fn();
const mockStockpileUpdateOne = jest.fn().mockResolvedValue({});
const mockTrackedMessageFind = jest.fn();
const mockTrackedMessageFindOne = jest.fn().mockResolvedValue(null);

jest.mock('../../data/models.js', () => ({
	Stockpile: {
		find: (...args) => mockStockpileFind(...args),
		updateOne: (...args) => mockStockpileUpdateOne(...args),
	},
	TrackedMessage: {
		find: (...args) => mockTrackedMessageFind(...args),
		findOne: (...args) => mockTrackedMessageFindOne(...args),
		findOneAndUpdate: jest.fn().mockResolvedValue(undefined),
		deleteOne: jest.fn().mockResolvedValue(undefined),
	},
}));

const { MessageFlags } = require('discord.js');
const { v2Text } = require('../../utils/componentsV2.js');

const {
	repairDuplicateStockpileIds,
	refreshTrackedStockpileList,
	refreshTrackedStockpileLists,
	syncAllStockpileLists,
} = require('../../utils/stockpileListSync.js');

function v2Message(edit = jest.fn().mockResolvedValue(undefined)) {
	return {
		id: 'msg-1',
		edit,
		deletable: true,
		delete: jest.fn().mockResolvedValue(undefined),
		flags: { has: (f) => f === MessageFlags.IsComponentsV2 },
	};
}

describe('stockpileListSync', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		mockBuildStockpileListPayload.mockResolvedValue(v2Text('list body'));
		mockTrackedMessageFindOne.mockResolvedValue(null);
	});

	describe('repairDuplicateStockpileIds', () => {
		it('retourne 0 pour une liste vide', async () => {
			mockStockpileFind.mockReturnValue({
				sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue([]) }),
			});
			expect(await repairDuplicateStockpileIds('guild-1')).toBe(0);
		});

		it('ne fait rien si tous les ids sont uniques', async () => {
			mockStockpileFind.mockReturnValue({
				sort: jest.fn().mockReturnValue({
					lean: jest.fn().mockResolvedValue([
						{ _id: 'a', id: '1' },
						{ _id: 'b', id: '2' },
					]),
				}),
			});

			const repaired = await repairDuplicateStockpileIds('guild-1');

			expect(repaired).toBe(0);
			expect(mockStockpileUpdateOne).not.toHaveBeenCalled();
		});

		it('réattribue un nouvel id aux doublons en conservant le plus ancien', async () => {
			mockStockpileFind.mockReturnValue({
				sort: jest.fn().mockReturnValue({
					lean: jest.fn().mockResolvedValue([
						{ _id: 'a', id: '5', createdAt: new Date('2024-01-01') },
						{ _id: 'b', id: '5', createdAt: new Date('2024-02-01') },
						{ _id: 'c', id: '7', createdAt: new Date('2024-03-01') },
					]),
				}),
			});

			const repaired = await repairDuplicateStockpileIds('guild-1');

			expect(repaired).toBe(1);
			expect(mockStockpileUpdateOne).toHaveBeenCalledWith({ _id: 'b' }, { $set: { id: '8' } });
		});

		it('repairDuplicateStockpileIds gère ids non numériques', async () => {
			mockStockpileFind.mockReturnValue({
				sort: jest.fn().mockReturnValue({
					lean: jest.fn().mockResolvedValue([
						{ _id: 'a', id: 'abc', createdAt: new Date('2024-01-01') },
						{ _id: 'b', id: 'abc', createdAt: new Date('2024-02-01') },
					]),
				}),
			});
			await repairDuplicateStockpileIds('guild-1');
			expect(mockStockpileUpdateOne).toHaveBeenCalledWith({ _id: 'b' }, { $set: { id: '1' } });
		});
	});

	describe('refreshTrackedStockpileList', () => {
		it('édite le message tracké avec payload V2', async () => {
			const mockMsgEdit = jest.fn().mockResolvedValue(undefined);
			const msg = v2Message(mockMsgEdit);
			mockTrackedMessageFindOne.mockResolvedValue({
				_id: 'doc-1',
				message_id: 'msg-1',
				server_id: 'guild-1',
				channel_id: 'ch-1',
			});
			const client = {
				channels: {
					fetch: jest.fn().mockResolvedValue({
						id: 'ch-1',
						isTextBased: () => true,
						messages: {
							fetch: jest.fn().mockResolvedValue(msg),
						},
					}),
				},
			};

			const ok = await refreshTrackedStockpileList(client, {
				server_id: 'guild-1',
				channel_id: 'ch-1',
				message_id: 'msg-1',
			});

			expect(ok).toBe(true);
			expect(mockBuildStockpileListPayload).toHaveBeenCalled();
			expect(mockMsgEdit).toHaveBeenCalledWith(expect.objectContaining({
				components: expect.any(Array),
				flags: expect.anything(),
			}));
			expect(mockMsgEdit.mock.calls[0][0].content).toBeUndefined();
			expect(mockMsgEdit.mock.calls[0][0].embeds).toBeUndefined();
		});

		it('édite avec STOCKPILE_LIST_EMPTY quand payload empty', async () => {
			mockBuildStockpileListPayload.mockResolvedValue(v2Text('STOCKPILE_LIST_EMPTY'));
			const mockMsgEdit = jest.fn().mockResolvedValue(undefined);
			mockTrackedMessageFindOne.mockResolvedValue({
				_id: 'doc-1',
				message_id: 'msg-1',
			});
			const client = {
				channels: {
					fetch: jest.fn().mockResolvedValue({
						id: 'ch-1',
						isTextBased: () => true,
						messages: {
							fetch: jest.fn().mockResolvedValue(v2Message(mockMsgEdit)),
						},
					}),
				},
			};

			await refreshTrackedStockpileList(client, {
				server_id: 'guild-1',
				channel_id: 'ch-1',
				message_id: 'msg-1',
			});

			expect(mockMsgEdit).toHaveBeenCalledWith(expect.objectContaining({
				components: expect.any(Array),
				flags: expect.anything(),
			}));
		});

		it('retourne false si channel absent ou non texte', async () => {
			const noChannel = { channels: { fetch: jest.fn().mockResolvedValue(null) } };
			expect(await refreshTrackedStockpileList(noChannel, { server_id: 'g', channel_id: 'c', message_id: 'm' })).toBe(false);

			const voice = {
				channels: {
					fetch: jest.fn().mockResolvedValue({ isTextBased: () => false }),
				},
			};
			expect(await refreshTrackedStockpileList(voice, { server_id: 'g', channel_id: 'c', message_id: 'm' })).toBe(false);
		});

		it('recrée le message si le tracké Discord a disparu', async () => {
			mockTrackedMessageFindOne.mockResolvedValue(null);
			const send = jest.fn().mockResolvedValue({ id: 'msg-new' });
			const client = {
				channels: {
					fetch: jest.fn().mockResolvedValue({
						id: 'c',
						isTextBased: () => true,
						send,
						messages: { fetch: jest.fn().mockResolvedValue(null) },
					}),
				},
			};
			expect(await refreshTrackedStockpileList(client, { server_id: 'g', channel_id: 'c', message_id: 'm' })).toBe(true);
			expect(send).toHaveBeenCalledWith(expect.objectContaining({
				components: expect.any(Array),
				flags: expect.anything(),
			}));
		});

		it('cutover legacy: saveTracked après repost', async () => {
			mockTrackedMessageFindOne.mockResolvedValue({
				_id: 'doc-1',
				message_id: 'msg-1',
				server_id: 'guild-1',
				channel_id: 'ch-1',
			});
			const del = jest.fn().mockResolvedValue(undefined);
			const send = jest.fn().mockResolvedValue({ id: 'msg-new' });
			const { TrackedMessage } = require('../../data/models.js');
			const client = {
				channels: {
					fetch: jest.fn().mockResolvedValue({
						id: 'ch-1',
						isTextBased: () => true,
						send,
						messages: {
							fetch: jest.fn().mockResolvedValue({
								id: 'msg-1',
								delete: del,
								flags: { has: () => false },
							}),
						},
					}),
				},
			};

			const ok = await refreshTrackedStockpileList(client, {
				server_id: 'guild-1',
				channel_id: 'ch-1',
				message_id: 'msg-1',
			});

			expect(ok).toBe(true);
			expect(del).toHaveBeenCalled();
			expect(send).toHaveBeenCalled();
			expect(TrackedMessage.findOneAndUpdate).toHaveBeenCalledWith(
				expect.anything(),
				expect.objectContaining({ message_id: 'msg-new' }),
				{ upsert: true },
			);
		});
		it('retourne false si buildStockpileListPayload throw', async () => {
			mockBuildStockpileListPayload.mockRejectedValue(new Error('fail'));
			const client = {
				channels: {
					fetch: jest.fn().mockResolvedValue({
						id: 'c',
						isTextBased: () => true,
						messages: {
							fetch: jest.fn().mockResolvedValue(v2Message()),
						},
					}),
				},
			};
			expect(await refreshTrackedStockpileList(client, { server_id: 'g', channel_id: 'c', message_id: 'm' })).toBe(false);
		});
	});

	describe('refreshTrackedStockpileLists', () => {
		it('filtre par guildIds quand fourni', async () => {
			mockTrackedMessageFind.mockReturnValue({ lean: jest.fn().mockResolvedValue([]) });
			const client = { channels: { fetch: jest.fn() } };
			await refreshTrackedStockpileLists(client, { guildIds: ['g1'] });
			expect(mockTrackedMessageFind).toHaveBeenCalledWith({
				message_type: 'stockpile_list',
				server_id: { $in: ['g1'] },
			});
		});

		it('rafraîchit sans filtre guildIds', async () => {
			mockTrackedMessageFind.mockReturnValue({ lean: jest.fn().mockResolvedValue([]) });
			await refreshTrackedStockpileLists({ channels: { fetch: jest.fn() } });
			expect(mockTrackedMessageFind).toHaveBeenCalledWith({ message_type: 'stockpile_list' });
		});

		it('refreshTrackedStockpileLists retourne 0 si refresh échoue', async () => {
			mockTrackedMessageFind.mockReturnValue({
				lean: jest.fn().mockResolvedValue([
					{ server_id: 'g1', channel_id: 'c1', message_id: 'm1' },
				]),
			});
			const client = {
				channels: {
					fetch: jest.fn().mockReturnValue(Promise.reject(new Error('down'))),
				},
			};
			await expect(refreshTrackedStockpileLists(client, { guildIds: ['g1'] })).resolves.toBe(0);
		});

		it('incrémente refreshed quand refreshTrackedStockpileList réussit', async () => {
			mockTrackedMessageFind.mockReturnValue({
				lean: jest.fn().mockResolvedValue([
					{ server_id: 'g1', channel_id: 'c1', message_id: 'm1' },
				]),
			});
			mockTrackedMessageFindOne.mockResolvedValue({
				_id: 'doc',
				message_id: 'm1',
			});
			mockBuildStockpileListPayload.mockResolvedValue(v2Text('ok'));
			const client = {
				channels: {
					fetch: jest.fn().mockResolvedValue({
						id: 'c1',
						isTextBased: () => true,
						messages: {
							fetch: jest.fn().mockResolvedValue(v2Message()),
						},
					}),
				},
			};
			await expect(refreshTrackedStockpileLists(client, { guildIds: ['g1'] })).resolves.toBe(1);
		});
	});

	describe('syncAllStockpileLists', () => {
		it('répare les ids et rafraîchit les listes trackées des serveurs actifs', async () => {
			mockStockpileFind.mockReturnValue({
				sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue([]) }),
			});
			mockTrackedMessageFind.mockReturnValue({
				lean: jest.fn().mockResolvedValue([
					{ server_id: 'guild-1', channel_id: 'ch-1', message_id: 'msg-1' },
				]),
			});

			const client = {
				guilds: { cache: new Map([['guild-1', {}]]) },
				channels: {
					fetch: jest.fn().mockResolvedValue({
						id: 'ch-1',
						isTextBased: () => true,
						messages: {
							fetch: jest.fn().mockResolvedValue(v2Message()),
						},
					}),
				},
			};
			mockTrackedMessageFindOne.mockResolvedValue({
				_id: 'doc',
				message_id: 'msg-1',
			});
			const logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);

			await syncAllStockpileLists(client);

			expect(mockTrackedMessageFind).toHaveBeenCalledWith({
				message_type: 'stockpile_list',
				server_id: { $in: ['guild-1'] },
			});
			expect(logSpy).toHaveBeenCalledWith('[StockpileList] 0 id(s) corrigé(s), 1 liste(s) rafraîchie(s).');

			logSpy.mockRestore();
		});

		it('ne log pas si rien à réparer ni rafraîchir', async () => {
			mockStockpileFind.mockReturnValue({
				sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue([]) }),
			});
			mockTrackedMessageFind.mockReturnValue({ lean: jest.fn().mockResolvedValue([]) });
			const client = { guilds: { cache: new Map([['guild-1', {}]]) } };
			const logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
			await syncAllStockpileLists(client);
			expect(logSpy).not.toHaveBeenCalled();
			logSpy.mockRestore();
		});

		it('return early si aucun guild', async () => {
			const logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
			await syncAllStockpileLists({ guilds: { cache: new Map() } });
			expect(mockStockpileFind).not.toHaveBeenCalled();
			expect(logSpy).not.toHaveBeenCalled();
			logSpy.mockRestore();
		});
	});

	describe('refreshTrackedStockpileList fetch catch callbacks', () => {
		it('retourne false si channels.fetch reject', async () => {
			const client = {
				channels: {
					fetch: jest.fn().mockRejectedValue(new Error('no channel')),
				},
			};
			await expect(refreshTrackedStockpileList(client, {
				server_id: 'g1',
				channel_id: 'c1',
				message_id: 'm1',
			})).resolves.toBe(false);
		});

		it('retourne false si messages.fetch reject et recreate échoue', async () => {
			mockTrackedMessageFindOne.mockResolvedValue({
				_id: 'doc',
				message_id: 'm1',
			});
			const client = {
				channels: {
					fetch: jest.fn().mockResolvedValue({
						id: 'c1',
						isTextBased: () => true,
						send: jest.fn().mockRejectedValue(new Error('cannot send')),
						messages: {
							fetch: jest.fn().mockRejectedValue(new Error('no msg')),
						},
					}),
				},
			};
			await expect(refreshTrackedStockpileList(client, {
				server_id: 'g1',
				channel_id: 'c1',
				message_id: 'm1',
			})).resolves.toBe(false);
		});
	});
});
