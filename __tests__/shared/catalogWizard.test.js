jest.mock('../../data/models.js', () => ({
	Server: {
		findOne: jest.fn(),
	},
}));

jest.mock('../../data/fournis.js', () => ({
	categories: {
		zebra: {
			icon: 'Z',
			subcategories: {
				late: {},
				early: {},
			},
		},
		alpha: {
			icon: 'A',
			subcategories: {
				bmat: {},
			},
		},
	},
	getMaterialsBySubcategory: jest.fn((cat, sub) => {
		if (cat === 'alpha' && sub === 'bmat') {
			return [
				{ itemName: 'Basic Materials', itemDesc: 'Bmats', faction: ['colonial', 'warden'] },
				{ itemName: 'Colonial Only', itemDesc: 'Col', faction: ['colonial'] },
				{ itemName: 'Warden Only', itemDesc: 'War', faction: ['warden'] },
				{ itemName: 'Shared No Faction', itemDesc: 'x'.repeat(120) },
			];
		}
		if (cat === 'alpha' && sub === 'empty') {
			return [];
		}
		return null;
	}),
}));

const { Server } = require('../../data/models.js');
const { getMaterialsBySubcategory } = require('../../data/fournis.js');
const {
	createCategoryRows,
	createSubcategoryRows,
	createMaterialSelectRows,
	getCamp,
} = require('../../shared/catalogWizard.js');
const stockCatalog = require('../../utils/stockCatalog.js');

describe('shared/catalogWizard', () => {
	const translations = {
		translate: jest.fn((key) => key),
	};

	beforeEach(() => {
		jest.clearAllMocks();
		translations.translate.mockImplementation((key) => key);
	});

	it('re-exporte via utils/stockCatalog', () => {
		expect(stockCatalog.createCategoryRows).toBe(createCategoryRows);
		expect(stockCatalog.getCamp).toBe(getCamp);
	});

	it('createCategoryRows trie et découpe par 5', () => {
		const rows = createCategoryRows(translations, 'b1');
		expect(rows.length).toBeGreaterThanOrEqual(1);
		const labels = rows[0].components.map((b) => b.data.label);
		expect(labels[0]).toContain('CATEGORY_ALPHA');
		expect(rows[0].components[0].data.custom_id).toBe('order_cat|b1|alpha');
	});

	it('createCategoryRows fallback label si translate undefined', () => {
		translations.translate.mockImplementation(() => undefined);
		const rows = createCategoryRows(translations, 'b1');
		expect(rows[0].components[0].data.label).toContain('alpha');
	});

	it('createCategoryRows sans icône category', () => {
		const { categories } = require('../../data/fournis.js');
		categories.noicon = {
			subcategories: { sub: {} },
		};
		translations.translate.mockImplementation((key) => key);
		const rows = createCategoryRows(translations, 'b1');
		const noIconBtn = rows.flatMap((r) => r.components)
			.find((b) => b.data.custom_id.includes('noicon'));
		expect(noIconBtn.data.label).toContain('CATEGORY_NOICON');
		delete categories.noicon;
	});

	it('createSubcategoryRows fallback labels undefined pour subcategories', () => {
		translations.translate.mockImplementation((key) => (
			key.startsWith('SUBCATEGORY_') ? undefined : key
		));
		const rows = createSubcategoryRows('b1', 'zebra', translations);
		expect(rows[0].components[0].data.label).toBe('early');
	});

	it('createSubcategoryRows ajoute un bouton back', () => {
		const rows = createSubcategoryRows('b1', 'zebra', translations);
		expect(rows.length).toBe(2);
		expect(rows[0].components[0].data.custom_id).toContain('order_sub|b1|zebra__');
		expect(rows[1].components[0].data.custom_id).toBe('order_back|b1');
		expect(rows[1].components[0].data.label).toBe('BACK');
	});

	it('createSubcategoryRows gère une catégorie inconnue', () => {
		const rows = createSubcategoryRows('b1', 'missing', translations);
		expect(rows).toHaveLength(1);
		expect(rows[0].components[0].data.custom_id).toBe('order_back|b1');
	});

	it('createMaterialSelectRows filtre par camp', async () => {
		const payload = await createMaterialSelectRows('b1', 'alpha', 'bmat', 'warden', translations);
		expect(payload.content).toBe('MATERIAL_SELECT_TYPE');
		const menu = payload.components[0].components[0];
		const values = menu.options.map((o) => o.data.value);
		expect(values).toContain('Basic Materials');
		expect(values).toContain('Warden Only');
		expect(values).toContain('Shared No Faction');
		expect(values).not.toContain('Colonial Only');
		expect(payload.components.at(-1).components[0].data.custom_id).toBe('order_cat|b1|alpha');
	});

	it('createMaterialSelectRows retourne empty si aucun matériau', async () => {
		getMaterialsBySubcategory.mockReturnValueOnce([]);
		const payload = await createMaterialSelectRows('b1', 'alpha', 'empty', null, translations);
		expect(payload.content).toBe('MATERIAL_SUBCATEGORY_EMPTY');
		expect(payload.components[0].components[0].data.custom_id).toBe('order_cat|b1|alpha');
	});

	it('getCamp lit le camp serveur', async () => {
		Server.findOne.mockResolvedValue({ camp: 'colonial' });
		await expect(getCamp('g1')).resolves.toBe('colonial');
		Server.findOne.mockResolvedValue(null);
		await expect(getCamp('g1')).resolves.toBeNull();
	});

	it('createMaterialSelectRows sans camp garde tous les items et tronque les descriptions', async () => {
		const payload = await createMaterialSelectRows('b1', 'alpha', 'bmat', null, translations);
		const menu = payload.components[0].components[0];
		const values = menu.options.map((o) => o.data.value);
		expect(values).toContain('Colonial Only');
		expect(values).toContain('Warden Only');
		const long = menu.options.find((o) => o.data.value === 'Shared No Faction');
		expect(long.data.description.endsWith('...')).toBe(true);
	});

	it('createMaterialSelectRows fallback subcategory label si translate undefined', async () => {
		translations.translate.mockImplementation((key) => (
			key.startsWith('SUBCATEGORY_') ? undefined : key
		));
		const payload = await createMaterialSelectRows('b1', 'alpha', 'bmat', 'warden', translations);
		expect(payload.components[0].components[0].data.placeholder).toContain('bmat #1');
	});

	it('createMaterialSelectRows utilise itemName si itemDesc absent', async () => {
		getMaterialsBySubcategory.mockReturnValueOnce([
			{ itemName: 'NoDesc', faction: ['warden'] },
		]);
		const payload = await createMaterialSelectRows('b1', 'alpha', 'bmat', 'warden', translations);
		const desc = payload.components[0].components[0].options[0].data.description;
		expect(desc).toBe('NoDesc');
	});

	it('createMaterialSelectRows gère getMaterialsBySubcategory null', async () => {
		getMaterialsBySubcategory.mockReturnValueOnce(null);
		const payload = await createMaterialSelectRows('b1', 'alpha', 'bmat', null, translations);
		expect(payload.content).toBe('MATERIAL_SUBCATEGORY_EMPTY');
	});

	it('createMaterialSelectRows découpe en menus de 25 et cap à 4', async () => {
		const many = Array.from({ length: 110 }, (_, i) => ({
			itemName: `Item ${String(i).padStart(3, '0')}`,
			itemDesc: `Desc ${i}`,
			faction: ['warden'],
		}));
		getMaterialsBySubcategory.mockReturnValueOnce(many);
		const payload = await createMaterialSelectRows('b1', 'alpha', 'bmat', 'warden', translations);
		const menus = payload.components.slice(0, -1);
		expect(menus).toHaveLength(4);
		expect(menus[0].components[0].options).toHaveLength(25);
		expect(menus[0].components[0].data.custom_id).toBe('order_catalog|b1|alpha|1');
	});
});
