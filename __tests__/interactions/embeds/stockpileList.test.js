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
	buildStockpileListDisplay,
	buildStockpileListPayload,
	buildStockpileListComponents,
	buildStockpileManageComponents,
	buildStockpileManagePayload,
	buildStockpileButtonLabel,
	buildStockpileTextParts,
	countStockIds,
	accentForStockpiles,
	STOCKPILE_ACCENT,
	STOCKPILE_ACCENT_WARN,
	STOCKPILE_ACCENT_CRITICAL,
} = require('../../../interactions/embeds/stockpileList.js');
const { MessageFlags } = require('discord.js');
const { getV2Text } = require('../../helpers/v2Payload.js');

describe('stockpileList display', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('buildStockpileTextParts vide', () => {
		const translations = { translate: (k) => k };
		expect(buildStockpileTextParts([], translations).children).toEqual(['STOCKPILE_LIST_EMPTY']);
		expect(buildStockpileTextParts(null, translations).bodyText).toBe('');
	});

	it('buildStockpileTextParts marque l’urgence et ignore dates invalides', () => {
		const translations = { translate: (k) => k };
		const now = Date.now();
		const parts = buildStockpileTextParts([
			{
				id: '1',
				region: 'R1',
				city: 'C1',
				name: 'Crit',
				password: '111111',
				owner_id: 'u1',
				deleted: false,
				expiresAt: new Date(now + 30 * 60 * 1000),
			},
			{
				id: '2',
				region: 'R1',
				city: 'C1',
				name: 'Warn',
				password: '222222',
				owner_id: 'u1',
				deleted: false,
				expiresAt: new Date(now + 2 * 60 * 60 * 1000),
			},
			{
				id: '3',
				region: 'R1',
				city: 'C1',
				name: 'Bad',
				password: '333333',
				owner_id: 'u1',
				deleted: false,
				expiresAt: 'not-a-date',
			},
			{
				id: '4',
				region: 'R1',
				city: 'C1',
				name: 'Gone',
				password: '444444',
				owner_id: 'u1',
				deleted: true,
				expiresAt: new Date(now + 1000),
			},
		], translations, now);
		expect(parts.bodyText).toContain('🔴');
		expect(parts.bodyText).toContain('🟠');
		expect(parts.bodyText).toContain('Crit');
		expect(parts.children.length).toBeGreaterThan(1);
	});

	describe('accentForStockpiles', () => {
		const now = Date.now();
		it('ignore deleted et dates invalides, applique warn/critical', () => {
			expect(accentForStockpiles([])).toBe(STOCKPILE_ACCENT);
			expect(accentForStockpiles([], undefined)).toBe(STOCKPILE_ACCENT);
			expect(accentForStockpiles(null, now)).toBe(STOCKPILE_ACCENT);
			expect(accentForStockpiles([
				{ deleted: true, expiresAt: new Date(now + 1000) },
				{ deleted: false, expiresAt: 'not-a-date' },
			], now)).toBe(STOCKPILE_ACCENT);
			expect(accentForStockpiles([
				{ deleted: false, expiresAt: new Date(now + 2 * 60 * 60 * 1000) },
			], now)).toBe(STOCKPILE_ACCENT_WARN);
			expect(accentForStockpiles([
				{ deleted: false, expiresAt: new Date(now + 30 * 60 * 1000) },
			], now)).toBe(STOCKPILE_ACCENT_CRITICAL);
		});
	});

	describe('buildStockpileListDisplay', () => {
		it('supprime les stocks expirés puis retourne isEmpty si aucun stock', async () => {
			const Stockpile = createStockpileMock([]);

			const result = await buildStockpileListDisplay(Stockpile, 'guild-1', { translate: mockTranslate });

			expect(mockDeleteMany).toHaveBeenCalledWith({
				server_id: 'guild-1',
				expiresAt: { $lte: expect.any(Date) },
			});
			expect(Stockpile.find).toHaveBeenCalledWith({ server_id: 'guild-1' });
			expect(result).toEqual(expect.objectContaining({
				body: null,
				isEmpty: true,
				stocks: [],
			}));
		});

		it('construit le body groupé par région/ville avec stocks triés par id croissant', async () => {
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

			const result = await buildStockpileListDisplay(Stockpile, 'guild-1', { translate: mockTranslate });

			expect(result.isEmpty).toBe(false);
			expect(result.body).toContain('STOCKPILE_LIST_CODES');
			expect(result.body).toContain('StockA');
			expect(result.body).toContain('StockB');
		});

		it('gère plusieurs régions, stocks deleted et owner absent', async () => {
			const stocks = [
				{
					id: '1',
					region: 'R1',
					city: 'C1',
					name: 'Alpha',
					password: '111111',
					owner_id: 'user-1',
					deleted: false,
					expiresAt: new Date(Date.now() + 86400000),
				},
				{
					id: '2',
					region: 'R2',
					city: 'C2',
					name: 'Beta',
					password: '222222',
					owner_id: null,
					deleted: true,
					expiresAt: new Date(Date.now() + 86400000),
				},
			];
			const Stockpile = createStockpileMock(stocks);
			const result = await buildStockpileListDisplay(Stockpile, 'guild-1', { translate: mockTranslate });
			expect(result.body).toContain('NONE');
			expect(result.body).toContain('~~');
			expect(result.body).toContain('R2');
		});

		it('insère une ligne vide entre deux régions', async () => {
			const stocks = [
				{
					id: '1',
					region: 'R1',
					city: 'C1',
					name: 'A',
					password: '111111',
					owner_id: 'u1',
					deleted: false,
					expiresAt: new Date(Date.now() + 86400000),
				},
				{
					id: '2',
					region: 'R2',
					city: 'C2',
					name: 'B',
					password: '222222',
					owner_id: 'u1',
					deleted: false,
					expiresAt: new Date(Date.now() + 86400000),
				},
			];
			const Stockpile = createStockpileMock(stocks);
			const result = await buildStockpileListDisplay(Stockpile, 'guild-1', { translate: mockTranslate });
			expect(result.body).toContain('R1');
			expect(result.body).toContain('R2');
		});

		it('regroupe plusieurs villes dans la même région', async () => {
			const stocks = [
				{
					id: '1',
					region: 'R1',
					city: 'C1',
					name: 'A',
					password: '111111',
					owner_id: 'u1',
					deleted: false,
					expiresAt: new Date(Date.now() + 86400000),
				},
				{
					id: '2',
					region: 'R1',
					city: 'C2',
					name: 'B',
					password: '222222',
					owner_id: 'u1',
					deleted: false,
					expiresAt: new Date(Date.now() + 86400000),
				},
			];
			const Stockpile = createStockpileMock(stocks);
			const result = await buildStockpileListDisplay(Stockpile, 'guild-1', { translate: mockTranslate });
			expect(result.body).toContain('C1');
			expect(result.body).toContain('C2');
		});

		it('accepte expiresAt sous forme de chaîne', async () => {
			const stocks = [{
				id: '1',
				region: 'R1',
				city: 'C1',
				name: 'A',
				password: '111111',
				owner_id: 'u1',
				deleted: false,
				expiresAt: new Date(Date.now() + 86400000).toISOString(),
			}];
			const Stockpile = createStockpileMock(stocks);
			const result = await buildStockpileListDisplay(Stockpile, 'guild-1', { translate: mockTranslate });
			expect(result.body).toContain('A');
		});
	});

	describe('buildStockpileButtonLabel', () => {
		it('retourne #id · nom si unique avec nom', () => {
			const counts = countStockIds([{ id: '3', _id: 'abc', name: 'Depot' }]);
			expect(buildStockpileButtonLabel({ id: '3', _id: 'abc', name: 'Depot' }, counts)).toBe('#3 · Depot');
		});

		it('retourne #id seul si unique sans nom', () => {
			const counts = countStockIds([{ id: '3', _id: 'abc' }]);
			expect(buildStockpileButtonLabel({ id: '3', _id: 'abc' }, counts)).toBe('#3');
		});

		it('retourne #id si absent du map de comptage', () => {
			const counts = countStockIds([{ id: '3', _id: 'abc' }]);
			expect(buildStockpileButtonLabel({ id: '99', _id: 'xyz' }, counts)).toBe('#99');
		});

		it('désambiguïse avec le nom si doublon id', () => {
			const counts = countStockIds([
				{ id: '5', _id: '507f1f77bcf86cd799439011', name: 'Alpha' },
				{ id: '5', _id: '507f1f77bcf86cd799439012', name: 'Bravo' },
			]);
			expect(buildStockpileButtonLabel(
				{ id: '5', _id: '507f1f77bcf86cd799439011', name: 'Alpha' },
				counts,
			)).toBe('#5 · Alpha');
		});

		it('désambiguïse avec _id si pas de nom', () => {
			const counts = countStockIds([
				{ id: '5', _id: '507f1f77bcf86cd799439011' },
				{ id: '5', _id: '507f1f77bcf86cd799439012' },
			]);
			const label = buildStockpileButtonLabel(
				{ id: '5', _id: '507f1f77bcf86cd799439011', name: '' },
				counts,
			);
			expect(label).toContain('#5');
			expect(label).toContain('9011');
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

		it('retourne [] si lean renvoie null', async () => {
			const result = await buildStockpileListComponents({
				find: jest.fn().mockReturnValue({
					lean: jest.fn().mockResolvedValue(null),
				}),
			}, 'guild-1', translations);
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

			expect(result[0].components[0].data.label).toBe('#5 · Alpha');
			expect(result[0].components[1].data.label).toBe('#5 · Bravo');
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

		it('fonctionne sans objet translations', async () => {
			const result = await buildStockpileManageComponents(createComponentsMock([]), 'guild-1');
			expect(result[0].components[0].data.label).toBe('STOCKPILE_BTN_CLEANUP');
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

		it('utilise #id comme description si name absent', async () => {
			const stocks = [
				{ _id: '507f1f77bcf86cd799439011', id: '7', name: '', server_id: 'guild-1', deleted: false },
			];
			const result = await buildStockpileManageComponents(createComponentsMock(stocks), 'guild-1', translations);
			expect(result[0].components[0].options[0].data.description).toBe('#7');
		});
	});

	describe('buildStockpileManagePayload', () => {
		const createPayloadMock = (allStocks, activeStocks = allStocks.filter((s) => !s.deleted)) => ({
			deleteMany: mockDeleteMany,
			find: jest.fn((query) => {
				if (query?.deleted === false) {
					return { lean: jest.fn().mockResolvedValue(activeStocks) };
				}
				return Promise.resolve(allStocks);
			}),
		});

		it('retourne payload V2 si liste non vide', async () => {
			const stocks = [{
				_id: '507f1f77bcf86cd799439011',
				id: '1',
				region: 'r1',
				city: 'c1',
				name: 'Alpha',
				password: '123456',
				owner_id: 'u1',
				deleted: false,
				expiresAt: new Date(Date.now() + 86400000),
			}];
			const Stockpile = createPayloadMock(stocks);

			const result = await buildStockpileManagePayload(Stockpile, 'guild-1', { translate: mockTranslate });

			expect(result.content).toBeUndefined();
			expect(result.embeds).toBeUndefined();
			expect(Number(result.flags) & MessageFlags.IsComponentsV2).toBeTruthy();
			expect(Number(result.flags) & MessageFlags.Ephemeral).toBeTruthy();
			expect(getV2Text(result)).toContain('Alpha');
			expect(result.components.length).toBeGreaterThan(0);
		});

		it('retourne STOCKPILE_LIST_EMPTY si aucun stock actif', async () => {
			const Stockpile = createPayloadMock([]);

			const result = await buildStockpileManagePayload(Stockpile, 'guild-1', { translate: mockTranslate });

			expect(getV2Text(result)).toContain('STOCKPILE_LIST_EMPTY');
			expect(Number(result.flags) & MessageFlags.IsComponentsV2).toBeTruthy();
			expect(result.components.length).toBeGreaterThan(0);
		});
	});

	describe('buildStockpileListPayload', () => {
		it('retourne V2 empty text si isEmpty', async () => {
			const Stockpile = createStockpileMock([]);
			const result = await buildStockpileListPayload(Stockpile, 'guild-1', { translate: mockTranslate });
			expect(getV2Text(result)).toContain('STOCKPILE_LIST_EMPTY');
			expect(Number(result.flags) & MessageFlags.IsComponentsV2).toBeTruthy();
		});

		it('retourne V2 avec body et boutons si liste non vide', async () => {
			const stocks = [{
				_id: '507f1f77bcf86cd799439011',
				id: '1',
				region: 'Deadlands',
				city: 'AbandonedWard',
				name: 'Alpha',
				password: '123456',
				owner_id: 'u1',
				deleted: false,
				expiresAt: new Date(Date.now() + 86400000),
			}];
			const Stockpile = {
				deleteMany: mockDeleteMany,
				find: jest.fn((query) => {
					if (query?.deleted === false) {
						return { lean: jest.fn().mockResolvedValue(stocks) };
					}
					return Promise.resolve(stocks);
				}),
			};
			const result = await buildStockpileListPayload(Stockpile, 'guild-1', { translate: mockTranslate });
			expect(getV2Text(result)).toContain('Alpha');
			expect(Number(result.flags) & MessageFlags.IsComponentsV2).toBeTruthy();
			expect(result.components.length).toBeGreaterThan(1);
		});
	});
});
