const mockTranslate = jest.fn((key) => key);

jest.mock('../../utils/translations.js', () => jest.fn().mockImplementation(() => ({ translate: mockTranslate })));

describe('ManageMaterial', () => {
	let ManageMaterial;
	const { ButtonStyle } = require('discord.js');

	beforeEach(() => {
		jest.clearAllMocks();
		ManageMaterial = require('../../utils/interaction/manage_material.js');
	});

	it('createButton crée un bouton avec customId, label et style', () => {
		const instance = new ManageMaterial({}, { id: 'g1' });
		const button = instance.createButton('test_id', 'Test Label', ButtonStyle.Primary);

		expect(button.data.custom_id).toBe('test_id');
		expect(button.data.label).toBe('Test Label');
		expect(button.data.style).toBe(ButtonStyle.Primary);
	});

	it('actionRow retourne 2 lignes de boutons', () => {
		const instance = new ManageMaterial({}, { id: 'g1' });
		const rows = instance.actionRow();

		expect(rows).toHaveLength(2);
	});

	it('actionRow crée Material, Quantity, Priority, Confirm, Delete', () => {
		const instance = new ManageMaterial({}, { id: 'g1' });
		instance.actionRow();

		expect(mockTranslate).toHaveBeenCalledWith('MATERIAL');
		expect(mockTranslate).toHaveBeenCalledWith('QUANTITY');
		expect(mockTranslate).toHaveBeenCalledWith('MATERIAL_PRIORITY');
		expect(mockTranslate).toHaveBeenCalledWith('CONFIRM');
		expect(mockTranslate).toHaveBeenCalledWith('DELETE');
	});

	it('actionRow utilise les bons customIds', () => {
		const instance = new ManageMaterial({}, { id: 'g1' });
		const rows = instance.actionRow();

		const allButtons = rows.flatMap((r) => r.components || []);
		const customIds = allButtons.map((b) => b.data?.custom_id ?? b.customId);

		expect(customIds).toContain('button_logistics_add_material');
		expect(customIds).toContain('button_logistics_add_quantity_ask');
		expect(customIds).toContain('button_logistics_add_priority');
		expect(customIds).toContain('button_logistics_add_confirm');
		expect(customIds).toContain('button_logistics_material_delete');
	});
});
