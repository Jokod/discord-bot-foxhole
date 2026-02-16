const path = require('path');

// Import des fichiers de traduction
const fr = require('../../languages/fr');
const en = require('../../languages/en');
const ru = require('../../languages/ru');
const zhCn = require('../../languages/zh-cn');

// Import des catégories
const { categories } = require('../../data/fournis');

function assertKeyInAllLanguages(key, languagesObj) {
	const langCodes = Object.keys(languagesObj);
	for (const langCode of langCodes) {
		const lang = languagesObj[langCode];
		expect(lang).toHaveProperty(key);
		expect(typeof lang[key]).toBe('string');
		expect(lang[key].length).toBeGreaterThan(0);
	}
}

describe('Material Categories Translations', () => {
	const languages = { fr, en, ru, 'zh-cn': zhCn };

	describe('Category Translations', () => {
		const mainCategories = [
			'CATEGORY_UTILITIES',
			'CATEGORY_INFANTRY_WEAPONS',
			'CATEGORY_AMMUNITION',
			'CATEGORY_RESOURCES',
			'CATEGORY_VEHICLES',
		];

		for (const categoryKey of mainCategories) {
			it(`should have ${categoryKey} in all languages`, () => {
				assertKeyInAllLanguages(categoryKey, languages);
			});
		}
	});

	describe('Utilities Subcategories Translations', () => {
		const subcategories = [
			'SUBCATEGORY_TOOLS',
			'SUBCATEGORY_FIELD_EQUIPMENT',
			'SUBCATEGORY_MOUNTED_EQUIPMENT',
			'SUBCATEGORY_MEDICAL',
			'SUBCATEGORY_UNIFORMS',
			'SUBCATEGORY_OUTFITS',
		];

		for (const subcategoryKey of subcategories) {
			it(`should have ${subcategoryKey} in all languages`, () => {
				assertKeyInAllLanguages(subcategoryKey, languages);
			});
		}
	});

	describe('Infantry Weapons Subcategories Translations', () => {
		const subcategories = [
			'SUBCATEGORY_SMALL_ARMS',
			'SUBCATEGORY_MELEE_WEAPONS',
			'SUBCATEGORY_MACHINE_GUNS',
			'SUBCATEGORY_HEAVY_ARMS',
			'SUBCATEGORY_GRENADES',
			'SUBCATEGORY_LAUNCHERS',
			'SUBCATEGORY_MORTAR',
		];

		for (const subcategoryKey of subcategories) {
			it(`should have ${subcategoryKey} in all languages`, () => {
				assertKeyInAllLanguages(subcategoryKey, languages);
			});
		}
	});

	describe('Ammunition Subcategories Translations', () => {
		const subcategories = [
			'SUBCATEGORY_LIGHT_AMMO',
			'SUBCATEGORY_TANK_AMMO',
			'SUBCATEGORY_AIRCRAFT_AMMO',
			'SUBCATEGORY_ARTILLERY_AMMO',
			'SUBCATEGORY_MISC_AMMO',
			'SUBCATEGORY_FLAMETHROWER_AMMO',
		];

		for (const subcategoryKey of subcategories) {
			it(`should have ${subcategoryKey} in all languages`, () => {
				assertKeyInAllLanguages(subcategoryKey, languages);
			});
		}
	});

	describe('Resources Subcategories Translations', () => {
		const subcategories = [
			'SUBCATEGORY_BMAT',
			'SUBCATEGORY_EMAT',
			'SUBCATEGORY_HEMAT',
			'SUBCATEGORY_RMAT',
			'SUBCATEGORY_GRAVEL',
		];

		for (const subcategoryKey of subcategories) {
			it(`should have ${subcategoryKey} in all languages`, () => {
				assertKeyInAllLanguages(subcategoryKey, languages);
			});
		}
	});

	describe('Vehicles Subcategories Translations', () => {
		const subcategories = ['SUBCATEGORY_VEHICLES'];

		for (const subcategoryKey of subcategories) {
			it(`should have ${subcategoryKey} in all languages`, () => {
				assertKeyInAllLanguages(subcategoryKey, languages);
			});
		}
	});

	describe('Translation Consistency', () => {
		it('should have same keys in all language files', () => {
			const frKeys = Object.keys(fr).sort();
			const langCodes = Object.keys(languages);
			for (const langCode of langCodes) {
				if (langCode === 'fr') continue;
				const lang = languages[langCode];
				const langKeys = Object.keys(lang).sort();
				for (const key of frKeys) {
					if (key.startsWith('CATEGORY_') || key.startsWith('SUBCATEGORY_')) {
						expect(langKeys).toContain(key);
					}
				}
			}
		});

		it('should not have empty translations', () => {
			const langCodes = Object.keys(languages);
			for (const langCode of langCodes) {
				const lang = languages[langCode];
				const keys = Object.keys(lang);
				for (const key of keys) {
					if (key.startsWith('CATEGORY_') || key.startsWith('SUBCATEGORY_')) {
						expect(lang[key].trim().length).toBeGreaterThan(0);
					}
				}
			}
		});
	});

	describe('Categories Match fournis.js Structure', () => {
		it('should have translations for all categories defined in fournis.js', () => {
			const categoryKeys = Object.keys(categories);
			const langCodes = Object.keys(languages);
			for (const categoryKey of categoryKeys) {
				const translationKey = `CATEGORY_${categoryKey.toUpperCase()}`;
				for (const langCode of langCodes) {
					const lang = languages[langCode];
					expect(lang).toHaveProperty(translationKey);
				}
			}
		});

		it('should have translations for all subcategories defined in fournis.js', () => {
			const subcategoryTranslationKeys = [];
			for (const categoryKey of Object.keys(categories)) {
				const category = categories[categoryKey];
				for (const subcategoryKey of Object.keys(category.subcategories)) {
					subcategoryTranslationKeys.push(`SUBCATEGORY_${subcategoryKey.toUpperCase()}`);
				}
			}
			const langCodes = Object.keys(languages);
			for (const translationKey of subcategoryTranslationKeys) {
				for (const langCode of langCodes) {
					const lang = languages[langCode];
					expect(lang).toHaveProperty(translationKey);
				}
			}
		});
	});

	describe('French Translations Quality', () => {
		it('should have French translations matching categorie.txt structure', () => {
			// Vérifie que les traductions FR correspondent aux catégories originales
			expect(fr.CATEGORY_UTILITIES).toBe('Utilitaires');
			expect(fr.CATEGORY_INFANTRY_WEAPONS).toBe('Armes d\'infanterie');
			expect(fr.CATEGORY_AMMUNITION).toBe('Munition');
			expect(fr.CATEGORY_RESOURCES).toBe('Ressources');
			expect(fr.CATEGORY_VEHICLES).toBe('Véhicule');
		});

		it('should have French subcategory translations matching categorie.txt', () => {
			// Utilities
			expect(fr.SUBCATEGORY_TOOLS).toBe('Outils');
			expect(fr.SUBCATEGORY_FIELD_EQUIPMENT).toBe('Matériel de terrain');
			expect(fr.SUBCATEGORY_MOUNTED_EQUIPMENT).toBe('Matériel monté');
			expect(fr.SUBCATEGORY_MEDICAL).toBe('Soins');
			expect(fr.SUBCATEGORY_UNIFORMS).toBe('Uniformes');
			expect(fr.SUBCATEGORY_OUTFITS).toBe('Tenues');

			// Infantry Weapons
			expect(fr.SUBCATEGORY_SMALL_ARMS).toBe('Armes légères');
			expect(fr.SUBCATEGORY_MELEE_WEAPONS).toBe('Armes de mêlée');
			expect(fr.SUBCATEGORY_MACHINE_GUNS).toBe('Mitrailleuses');
			expect(fr.SUBCATEGORY_HEAVY_ARMS).toBe('Armes lourdes diverses');
			expect(fr.SUBCATEGORY_GRENADES).toBe('Grenades');
			expect(fr.SUBCATEGORY_LAUNCHERS).toBe('Lanceurs');
			expect(fr.SUBCATEGORY_MORTAR).toBe('Mortier');

			// Ammunition
			expect(fr.SUBCATEGORY_LIGHT_AMMO).toBe('Munitions légères');
			expect(fr.SUBCATEGORY_TANK_AMMO).toBe('Munitions tank');
			expect(fr.SUBCATEGORY_ARTILLERY_AMMO).toBe('Munitions artillerie');
			expect(fr.SUBCATEGORY_MISC_AMMO).toBe('Munitions diverses');
			expect(fr.SUBCATEGORY_FLAMETHROWER_AMMO).toBe('Munitions lance flamme');

			// Resources
			expect(fr.SUBCATEGORY_BMAT).toBe('bmat');
			expect(fr.SUBCATEGORY_EMAT).toBe('emat');
			expect(fr.SUBCATEGORY_HEMAT).toBe('HEmat');
			expect(fr.SUBCATEGORY_RMAT).toBe('Rmat');
			expect(fr.SUBCATEGORY_GRAVEL).toBe('Gravel');
		});
	});

	describe('Material Priority Translations', () => {
		const priorityKeys = [
			'MATERIAL_PRIORITY',
			'MATERIAL_PRIORITY_LOW',
			'MATERIAL_PRIORITY_NEUTRAL',
			'MATERIAL_PRIORITY_HIGH',
		];

		it('should have priority translation keys in all languages', () => {
			for (const key of priorityKeys) {
				assertKeyInAllLanguages(key, languages);
			}
		});

		it('should not have empty priority translations', () => {
			const langCodes = Object.keys(languages);
			for (const langCode of langCodes) {
				const lang = languages[langCode];
				for (const key of priorityKeys) {
					expect(lang[key].trim().length).toBeGreaterThan(0);
				}
			}
		});
	});

	describe('Material flow translations (errors, status, manage)', () => {
		const materialFlowKeys = [
			'MATERIAL_CANNOT_MANAGE_ERROR',
			'MATERIAL_ARE_NO_OWNER_ERROR',
			'MATERIAL_NOT_EXIST',
			'MATERIAL_BACK_ERROR',
			'MATERIAL_CREATE_ERROR',
			'MATERIAL_UPDATE_ERROR',
			'MATERIAL_DELETE_SUCCESS',
			'MATERIAL_DELETE_ERROR',
			'MATERIAL_CONFIRM_ERROR',
			'MATERIAL_VALIDATE_ERROR',
			'MATERIAL_ASSIGN_ERROR',
			'MATERIAL_HAVE_NO_NAME_OR_QUANTITY',
			'MATERIAL_SELECT_QUANTITY_ERROR',
			'MATERIAL_QUANTITY_ERROR',
			'MATERIAL_LOCALIZATION_ERROR',
			'MATERIAL_SELECT_ERROR',
			'CONFIRMED',
		];

		it('should have all material flow keys in all languages', () => {
			for (const key of materialFlowKeys) {
				assertKeyInAllLanguages(key, languages);
			}
		});
	});

	describe('Legacy Material Translations', () => {
		it('should still have legacy material category translations', () => {
			const legacyKeys = [
				'MATERIAL_SMALL_ARMS',
				'MATERIAL_HEAVY_ARMS',
				'MATERIAL_UTILITIES',
				'MATERIAL_VEHICLES',
				'MATERIAL_UNIFORMS',
				'MATERIAL_RESOURCES',
				'MATERIAL_MEDICAL',
			];

			const langCodes = Object.keys(languages);
			for (const key of legacyKeys) {
				for (const langCode of langCodes) {
					const lang = languages[langCode];
					expect(lang).toHaveProperty(key);
				}
			}
		});
	});
});
