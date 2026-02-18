const mockTranslate = jest.fn((key) => key);
jest.mock('../../../utils/translations.js', () => jest.fn().mockImplementation(() => ({ translate: mockTranslate })));
jest.mock('../../../utils/colors.js', () => ({ getRandomColor: jest.fn().mockReturnValue(0xabcdef) }));
jest.mock('../../../utils/formatLocation.js', () => ({ formatForDisplay: (x) => x || '' }));
jest.mock('../../../utils/markdown.js', () => ({ safeEscapeMarkdown: (x) => (typeof x === 'string' ? x.replace(/\*/g, '\\*') : x) }));

const mockDeleteMany = jest.fn().mockResolvedValue({ deletedCount: 0 });

const createStockpileMock = (findResult) => ({
	deleteMany: mockDeleteMany,
	find: jest.fn().mockResolvedValue(findResult),
});

const { buildStockpileListEmbed, buildStockpileListComponents } = require('../../../interactions/embeds/stockpileList.js');

describe('stockpileList embed', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	describe('buildStockpileListEmbed', () => {
		it('supprime les stocks expirés puis retourne isEmpty si aucun stock', async () => {
			const Stockpile = createStockpileMock([]);

			const result = await buildStockpileListEmbed(Stockpile, 'guild-1', { translate: mockTranslate });

			expect(mockDeleteMany).toHaveBeenCalledWith({
				server_id: 'guild-1',
				expiresAt: { $lte: expect.any(Date) },
			});
			expect(Stockpile.find).toHaveBeenCalledWith({ server_id: 'guild-1' });
			expect(result).toEqual({ embed: null, isEmpty: true, stocks: [] });
		});

		it('construit l\'embed avec les stocks triés par région, ville, id', async () => {
			const stocks = [
				{
					id: '2',
					region: 'R1',
					city: 'C1',
					name: 'StockA',
					password: '123456',
					owner_id: 'user-1',
					deleted: false,
					expiresAt: new Date(Date.now() + 86400000),
				},
				{
					id: '1',
					region: 'R1',
					city: 'C1',
					name: 'StockB',
					password: '654321',
					owner_id: null,
					deleted: false,
					expiresAt: new Date(Date.now() + 86400000),
				},
			];
			const Stockpile = createStockpileMock(stocks);

			const result = await buildStockpileListEmbed(Stockpile, 'guild-1', { translate: mockTranslate });

			expect(result.isEmpty).toBe(false);
			expect(result.embed).toBeDefined();
			expect(result.embed.data.title).toContain('STOCKPILE_LIST_CODES');
			expect(result.embed.data.description).toContain('StockA');
			expect(result.embed.data.description).toContain('StockB');
		});
	});

	describe('buildStockpileListComponents', () => {
		it('retourne [] si aucun stock actif', async () => {
			const Stockpile = {
				find: jest.fn().mockReturnValue({
					sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue([]) }),
				}),
			};

			const result = await buildStockpileListComponents(Stockpile, 'guild-1');

			expect(result).toEqual([]);
		});

		it('retourne des ActionRows avec boutons pour chaque stock', async () => {
			const stocks = [
				{ id: '1', server_id: 'guild-1', deleted: false },
				{ id: '2', server_id: 'guild-1', deleted: false },
			];
			const Stockpile = {
				find: jest.fn().mockReturnValue({
					sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(stocks) }),
				}),
			};

			const result = await buildStockpileListComponents(Stockpile, 'guild-1');

			expect(result.length).toBe(1);
			expect(result[0].components.length).toBe(2);
			expect(result[0].components[0].data.custom_id).toBe('stockpile_reset-1');
			expect(result[0].components[1].data.custom_id).toBe('stockpile_reset-2');
		});
	});
});
