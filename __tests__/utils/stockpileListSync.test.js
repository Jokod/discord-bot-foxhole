const mockTranslate = jest.fn((key) => key);

jest.mock('../../utils/translations.js', () => jest.fn().mockImplementation(() => ({ translate: mockTranslate })));

const mockBuildStockpileListEmbed = jest.fn();
const mockBuildStockpileListComponents = jest.fn();

jest.mock('../../interactions/embeds/stockpileList.js', () => ({
	buildStockpileListEmbed: (...args) => mockBuildStockpileListEmbed(...args),
	buildStockpileListComponents: (...args) => mockBuildStockpileListComponents(...args),
}));

const mockStockpileFind = jest.fn();
const mockStockpileUpdateOne = jest.fn().mockResolvedValue({});
const mockTrackedMessageFind = jest.fn();

jest.mock('../../data/models.js', () => ({
	Stockpile: {
		find: (...args) => mockStockpileFind(...args),
		updateOne: (...args) => mockStockpileUpdateOne(...args),
	},
	TrackedMessage: {
		find: (...args) => mockTrackedMessageFind(...args),
	},
}));

const {
	repairDuplicateStockpileIds,
	refreshTrackedStockpileList,
	syncAllStockpileLists,
} = require('../../utils/stockpileListSync.js');

describe('stockpileListSync', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		mockBuildStockpileListEmbed.mockResolvedValue({ embed: { data: {} }, isEmpty: false });
		mockBuildStockpileListComponents.mockResolvedValue([]);
	});

	describe('repairDuplicateStockpileIds', () => {
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
	});

	describe('refreshTrackedStockpileList', () => {
		it('édite le message tracké avec embed et composants', async () => {
			const mockMsgEdit = jest.fn().mockResolvedValue(undefined);
			const client = {
				channels: {
					fetch: jest.fn().mockResolvedValue({
						isTextBased: () => true,
						messages: {
							fetch: jest.fn().mockResolvedValue({ edit: mockMsgEdit }),
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
			expect(mockBuildStockpileListEmbed).toHaveBeenCalled();
			expect(mockBuildStockpileListComponents).toHaveBeenCalled();
			expect(mockMsgEdit).toHaveBeenCalledWith(expect.objectContaining({ embeds: expect.any(Array) }));
		});

		it('édite avec STOCKPILE_LIST_EMPTY quand isEmpty', async () => {
			mockBuildStockpileListEmbed.mockResolvedValue({ embed: null, isEmpty: true });
			const mockMsgEdit = jest.fn().mockResolvedValue(undefined);
			const client = {
				channels: {
					fetch: jest.fn().mockResolvedValue({
						isTextBased: () => true,
						messages: {
							fetch: jest.fn().mockResolvedValue({ edit: mockMsgEdit }),
						},
					}),
				},
			};

			await refreshTrackedStockpileList(client, {
				server_id: 'guild-1',
				channel_id: 'ch-1',
				message_id: 'msg-1',
			});

			expect(mockMsgEdit).toHaveBeenCalledWith({
				content: 'STOCKPILE_LIST_EMPTY',
				embeds: [],
				components: [],
			});
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
						isTextBased: () => true,
						messages: {
							fetch: jest.fn().mockResolvedValue({ edit: jest.fn().mockResolvedValue(undefined) }),
						},
					}),
				},
			};
			const logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);

			await syncAllStockpileLists(client);

			expect(mockTrackedMessageFind).toHaveBeenCalledWith({
				message_type: 'stockpile_list',
				server_id: { $in: ['guild-1'] },
			});
			expect(logSpy).toHaveBeenCalledWith('[StockpileList] 0 id(s) corrigé(s), 1 liste(s) rafraîchie(s).');

			logSpy.mockRestore();
		});
	});
});
