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

const {
	buildStockpileListEmbed,
	buildStockpileListComponents,
	buildStockpileManageComponents,
} = require('../../../interactions/embeds/stockpileList.js');

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

		it('construit l\'embed groupé par région/ville avec stocks triés par id croissant', async () => {
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
		const translations = { translate: mockTranslate };

		const createComponentsMock = (findResult) => ({
			find: jest.fn().mockReturnValue({
				lean: jest.fn().mockResolvedValue(findResult),
			}),
		});

		it('retourne aucun composant si aucun stock actif', async () => {
			const result = await buildStockpileListComponents(createComponentsMock([]), 'guild-1', translations);

			expect(result).toEqual([]);
		});

		it('retourne uniquement les boutons reset (pas de remove ni admin)', async () => {
			const stocks = [
				{ _id: '507f1f77bcf86cd799439011', id: '1', server_id: 'guild-1', deleted: false },
				{ _id: '507f1f77bcf86cd799439012', id: '2', server_id: 'guild-1', deleted: false },
			];

			const result = await buildStockpileListComponents(createComponentsMock(stocks), 'guild-1', translations);

			expect(result.length).toBe(1);
			expect(result[0].components.length).toBe(2);
			expect(result[0].components[0].data.custom_id).toBe('stockpile_reset-507f1f77bcf86cd799439011');
			expect(result[0].components[1].data.custom_id).toBe('stockpile_reset-507f1f77bcf86cd799439012');
		});

		it('trie les boutons par id numérique et non alphabétique', async () => {
			const stocks = [
				{ _id: '507f1f77bcf86cd799439010', id: '10', server_id: 'guild-1', deleted: false },
				{ _id: '507f1f77bcf86cd799439001', id: '1', server_id: 'guild-1', deleted: false },
				{ _id: '507f1f77bcf86cd799439002', id: '2', server_id: 'guild-1', deleted: false },
				{ _id: '507f1f77bcf86cd799439011', id: '11', server_id: 'guild-1', deleted: false },
			];

			const result = await buildStockpileListComponents(createComponentsMock(stocks), 'guild-1', translations);

			expect(result[0].components.map((b) => b.data.label)).toEqual(['#1', '#2', '#10', '#11']);
		});

		it('ignore les doublons de _id pour éviter des custom_id dupliqués', async () => {
			const stocks = [
				{ _id: '507f1f77bcf86cd799439011', id: '1', server_id: 'guild-1', deleted: false },
				{ _id: '507f1f77bcf86cd799439011', id: '1', server_id: 'guild-1', deleted: false },
				{ _id: '507f1f77bcf86cd799439012', id: '2', server_id: 'guild-1', deleted: false },
			];

			const result = await buildStockpileListComponents(createComponentsMock(stocks), 'guild-1', translations);

			expect(result[0].components.length).toBe(2);
		});

		it('désambiguïse les labels quand plusieurs stocks partagent le même id', async () => {
			const stocks = [
				{ _id: '507f1f77bcf86cd799439011', id: '5', name: 'Alpha', server_id: 'guild-1', deleted: false },
				{ _id: '507f1f77bcf86cd799439012', id: '5', name: 'Bravo', server_id: 'guild-1', deleted: false },
			];

			const result = await buildStockpileListComponents(createComponentsMock(stocks), 'guild-1', translations);

			expect(result[0].components[0].data.label).toBe('#5 Alpha');
			expect(result[0].components[1].data.label).toBe('#5 Bravo');
		});
	});

	describe('buildStockpileManageComponents', () => {
		const translations = { translate: mockTranslate };

		const createComponentsMock = (findResult) => ({
			find: jest.fn().mockReturnValue({
				lean: jest.fn().mockResolvedValue(findResult),
			}),
		});

		it('retourne uniquement la rangée admin si aucun stock actif', async () => {
			const result = await buildStockpileManageComponents(createComponentsMock([]), 'guild-1', translations);

			expect(result.length).toBe(1);
			expect(result[0].components.length).toBe(2);
			expect(result[0].components[0].data.custom_id).toBe('stockpile_cleanup');
			expect(result[0].components[1].data.custom_id).toBe('stockpile_deleteall');
		});

		it('retourne select remove + rangée admin', async () => {
			const stocks = [
				{ _id: '507f1f77bcf86cd799439011', id: '1', name: 'Alpha', server_id: 'guild-1', deleted: false },
				{ _id: '507f1f77bcf86cd799439012', id: '2', name: 'Bravo', server_id: 'guild-1', deleted: false },
			];

			const result = await buildStockpileManageComponents(createComponentsMock(stocks), 'guild-1', translations);

			expect(result.length).toBe(2);
			expect(result[0].components[0].data.custom_id).toBe('select_stockpile_remove');
			expect(result[1].components[0].data.custom_id).toBe('stockpile_cleanup');
			expect(result[1].components[1].data.custom_id).toBe('stockpile_deleteall');
			expect(mockTranslate).toHaveBeenCalledWith('STOCKPILE_BTN_CLEANUP');
			expect(mockTranslate).toHaveBeenCalledWith('STOCKPILE_BTN_DELETEALL');
		});
	});
});
