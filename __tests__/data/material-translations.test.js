const path = require('path');

// Import des fichiers de traduction
const fr = require('../../languages/fr');
const en = require('../../languages/en');
const ru = require('../../languages/ru');
const zhCn = require('../../languages/zh-cn');

// Import des catégories
const { categories } = require('../../data/fournis');

describe('Material Categories Translations', () => {
	const languages = { fr, en, ru, 'zh-cn': zhCn };
	
	describe('Category Translations', () => {
		const mainCategories = [
			'CATEGORY_UTILITIES',
			'CATEGORY_INFANTRY_WEAPONS',
			'CATEGORY_AMMUNITION',
			'CATEGORY_RESOURCES',
			'CATEGORY_VEHICLES'
		];

		mainCategories.forEach(categoryKey => {
			it(`should have ${categoryKey} in all languages`, () => {
				Object.keys(languages).forEach(langCode => {
					const lang = languages[langCode];
					expect(lang).toHaveProperty(categoryKey);
					expect(typeof lang[categoryKey]).toBe('string');
					expect(lang[categoryKey].length).toBeGreaterThan(0);
				});
			});
		});
	});

	describe('Utilities Subcategories Translations', () => {
		const subcategories = [
			'SUBCATEGORY_TOOLS',
			'SUBCATEGORY_FIELD_EQUIPMENT',
			'SUBCATEGORY_MOUNTED_EQUIPMENT',
			'SUBCATEGORY_MEDICAL',
			'SUBCATEGORY_UNIFORMS',
			'SUBCATEGORY_OUTFITS'
		];

		subcategories.forEach(subcategoryKey => {
			it(`should have ${subcategoryKey} in all languages`, () => {
				Object.keys(languages).forEach(langCode => {
					const lang = languages[langCode];
					expect(lang).toHaveProperty(subcategoryKey);
					expect(typeof lang[subcategoryKey]).toBe('string');
					expect(lang[subcategoryKey].length).toBeGreaterThan(0);
				});
			});
		});
	});

	describe('Infantry Weapons Subcategories Translations', () => {
		const subcategories = [
			'SUBCATEGORY_SMALL_ARMS',
			'SUBCATEGORY_MELEE_WEAPONS',
			'SUBCATEGORY_MACHINE_GUNS',
			'SUBCATEGORY_HEAVY_ARMS',
			'SUBCATEGORY_GRENADES',
			'SUBCATEGORY_LAUNCHERS',
			'SUBCATEGORY_MORTAR'
		];

		subcategories.forEach(subcategoryKey => {
			it(`should have ${subcategoryKey} in all languages`, () => {
				Object.keys(languages).forEach(langCode => {
					const lang = languages[langCode];
					expect(lang).toHaveProperty(subcategoryKey);
					expect(typeof lang[subcategoryKey]).toBe('string');
					expect(lang[subcategoryKey].length).toBeGreaterThan(0);
				});
			});
		});
	});

	describe('Ammunition Subcategories Translations', () => {
		const subcategories = [
			'SUBCATEGORY_LIGHT_AMMO',
			'SUBCATEGORY_TANK_AMMO',
			'SUBCATEGORY_AIRCRAFT_AMMO',
			'SUBCATEGORY_ARTILLERY_AMMO',
			'SUBCATEGORY_MISC_AMMO',
			'SUBCATEGORY_FLAMETHROWER_AMMO'
		];

		subcategories.forEach(subcategoryKey => {
			it(`should have ${subcategoryKey} in all languages`, () => {
				Object.keys(languages).forEach(langCode => {
					const lang = languages[langCode];
					expect(lang).toHaveProperty(subcategoryKey);
					expect(typeof lang[subcategoryKey]).toBe('string');
					expect(lang[subcategoryKey].length).toBeGreaterThan(0);
				});
			});
		});
	});

	describe('Resources Subcategories Translations', () => {
		const subcategories = [
			'SUBCATEGORY_BMAT',
			'SUBCATEGORY_EMAT',
			'SUBCATEGORY_HEMAT',
			'SUBCATEGORY_RMAT',
			'SUBCATEGORY_GRAVEL'
		];

		subcategories.forEach(subcategoryKey => {
			it(`should have ${subcategoryKey} in all languages`, () => {
				Object.keys(languages).forEach(langCode => {
					const lang = languages[langCode];
					expect(lang).toHaveProperty(subcategoryKey);
					expect(typeof lang[subcategoryKey]).toBe('string');
					expect(lang[subcategoryKey].length).toBeGreaterThan(0);
				});
			});
		});
	});

	describe('Vehicles Subcategories Translations', () => {
		const subcategories = [
			'SUBCATEGORY_VEHICLES'
		];

		subcategories.forEach(subcategoryKey => {
			it(`should have ${subcategoryKey} in all languages`, () => {
				Object.keys(languages).forEach(langCode => {
					const lang = languages[langCode];
					expect(lang).toHaveProperty(subcategoryKey);
					expect(typeof lang[subcategoryKey]).toBe('string');
					expect(lang[subcategoryKey].length).toBeGreaterThan(0);
				});
			});
		});
	});

	describe('Translation Consistency', () => {
		it('should have same keys in all language files', () => {
			const frKeys = Object.keys(fr).sort();
			
			Object.keys(languages).forEach(langCode => {
				if (langCode === 'fr') return;
				
				const lang = languages[langCode];
				const langKeys = Object.keys(lang).sort();
				
				// Vérifie que toutes les clés FR sont présentes
				frKeys.forEach(key => {
					if (key.startsWith('CATEGORY_') || key.startsWith('SUBCATEGORY_')) {
						expect(langKeys).toContain(key);
					}
				});
			});
		});

		it('should not have empty translations', () => {
			Object.keys(languages).forEach(langCode => {
				const lang = languages[langCode];
				
				Object.keys(lang).forEach(key => {
					if (key.startsWith('CATEGORY_') || key.startsWith('SUBCATEGORY_')) {
						expect(lang[key].trim().length).toBeGreaterThan(0);
					}
				});
			});
		});
	});

	describe('Categories Match fournis.js Structure', () => {
		it('should have translations for all categories defined in fournis.js', () => {
			const categoryKeys = Object.keys(categories);
			
			categoryKeys.forEach(categoryKey => {
				const translationKey = `CATEGORY_${categoryKey.toUpperCase()}`;
				
				Object.keys(languages).forEach(langCode => {
					const lang = languages[langCode];
					expect(lang).toHaveProperty(translationKey);
				});
			});
		});

		it('should have translations for all subcategories defined in fournis.js', () => {
			Object.keys(categories).forEach(categoryKey => {
				const category = categories[categoryKey];
				
				Object.keys(category.subcategories).forEach(subcategoryKey => {
					const translationKey = `SUBCATEGORY_${subcategoryKey.toUpperCase()}`;
					
					Object.keys(languages).forEach(langCode => {
						const lang = languages[langCode];
						expect(lang).toHaveProperty(translationKey);
					});
				});
			});
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

	describe('Legacy Material Translations', () => {
		it('should still have legacy material category translations', () => {
			const legacyKeys = [
				'MATERIAL_SMALL_ARMS',
				'MATERIAL_HEAVY_ARMS',
				'MATERIAL_UTILITIES',
				'MATERIAL_VEHICLES',
				'MATERIAL_UNIFORMS',
				'MATERIAL_RESOURCES',
				'MATERIAL_MEDICAL'
			];

			legacyKeys.forEach(key => {
				Object.keys(languages).forEach(langCode => {
					const lang = languages[langCode];
					expect(lang).toHaveProperty(key);
				});
			});
		});
	});
});
