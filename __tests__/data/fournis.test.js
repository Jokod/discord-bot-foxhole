const fs = require('fs');
const path = require('path');

// Import du module à tester
const fournis = require('../../data/fournis');

describe('Fournis - Material Management System', () => {
	describe('Categories Structure', () => {
		it('should have all main categories defined', () => {
			const expectedCategories = [
				'utilities',
				'infantry_weapons',
				'ammunition',
				'resources',
				'vehicles',
			];

			const actualCategories = Object.keys(fournis.categories);

			expect(actualCategories).toEqual(expect.arrayContaining(expectedCategories));
			expect(actualCategories.length).toBe(expectedCategories.length);
		});

		it('should have correct structure for each category', () => {
			Object.keys(fournis.categories).forEach(categoryKey => {
				const category = fournis.categories[categoryKey];

				expect(category).toHaveProperty('name');
				expect(category).toHaveProperty('icon');
				expect(category).toHaveProperty('subcategories');

				expect(category.name).toHaveProperty('en');
				expect(category.name).toHaveProperty('fr');
				expect(typeof category.icon).toBe('string');
				expect(typeof category.subcategories).toBe('object');
			});
		});

		it('should have utilities subcategories', () => {
			const utilitiesSubcategories = Object.keys(fournis.categories.utilities.subcategories);

			expect(utilitiesSubcategories).toContain('tools');
			expect(utilitiesSubcategories).toContain('field_equipment');
			expect(utilitiesSubcategories).toContain('mounted_equipment');
			expect(utilitiesSubcategories).toContain('medical');
			expect(utilitiesSubcategories).toContain('uniforms');
			expect(utilitiesSubcategories).toContain('outfits');
		});

		it('should have infantry_weapons subcategories', () => {
			const infantrySubcategories = Object.keys(fournis.categories.infantry_weapons.subcategories);

			expect(infantrySubcategories).toContain('small_arms');
			expect(infantrySubcategories).toContain('melee_weapons');
			expect(infantrySubcategories).toContain('machine_guns');
			expect(infantrySubcategories).toContain('heavy_arms');
			expect(infantrySubcategories).toContain('grenades');
			expect(infantrySubcategories).toContain('launchers');
			expect(infantrySubcategories).toContain('mortar');
		});

		it('should have ammunition subcategories', () => {
			const ammoSubcategories = Object.keys(fournis.categories.ammunition.subcategories);

			expect(ammoSubcategories).toContain('light_ammo');
			expect(ammoSubcategories).toContain('tank_ammo');
			expect(ammoSubcategories).toContain('aircraft_ammo');
			expect(ammoSubcategories).toContain('artillery_ammo');
			expect(ammoSubcategories).toContain('misc_ammo');
			expect(ammoSubcategories).toContain('flamethrower_ammo');
		});

		it('should have resources subcategories', () => {
			const resourcesSubcategories = Object.keys(fournis.categories.resources.subcategories);

			expect(resourcesSubcategories).toContain('bmat');
			expect(resourcesSubcategories).toContain('emat');
			expect(resourcesSubcategories).toContain('hemat');
			expect(resourcesSubcategories).toContain('rmat');
			expect(resourcesSubcategories).toContain('gravel');
		});

		it('should have vehicles subcategories', () => {
			const vehiclesSubcategories = Object.keys(fournis.categories.vehicles.subcategories);

			expect(vehiclesSubcategories).toContain('vehicles');
		});
	});

	describe('Material Files', () => {
		function getAllSubcategoryFilePaths() {
			const materialsPath = path.join(__dirname, '../../data/materials');
			const paths = [];
			for (const category of Object.keys(fournis.categories)) {
				const categoryPath = path.join(materialsPath, category);
				for (const subcategory of Object.keys(fournis.categories[category].subcategories)) {
					paths.push(path.join(categoryPath, `${subcategory}.json`));
				}
			}
			return paths;
		}

		it('should have JSON files for all subcategories', () => {
			const materialsPath = path.join(__dirname, '../../data/materials');
			for (const category of Object.keys(fournis.categories)) {
				const categoryPath = path.join(materialsPath, category);
				expect(fs.existsSync(categoryPath)).toBe(true);
			}
			const filePaths = getAllSubcategoryFilePaths();
			for (const filePath of filePaths) {
				expect(fs.existsSync(filePath)).toBe(true);
			}
		});

		it('should have valid JSON in all material files', () => {
			const filePaths = getAllSubcategoryFilePaths();
			for (const filePath of filePaths) {
				const content = fs.readFileSync(filePath, 'utf8');
				expect(() => JSON.parse(content)).not.toThrow();
				const materials = JSON.parse(content);
				expect(Array.isArray(materials)).toBe(true);
			}
		});

		it('should have materials with correct structure', () => {
			const filePaths = getAllSubcategoryFilePaths();
			let totalMaterials = 0;
			const allMaterials = [];
			for (const filePath of filePaths) {
				const materials = JSON.parse(fs.readFileSync(filePath, 'utf8'));
				totalMaterials += materials.length;
				allMaterials.push(...materials);
			}
			for (const material of allMaterials) {
				expect(material).toHaveProperty('itemName');
				expect(material).toHaveProperty('itemDesc');
				expect(material).toHaveProperty('faction');
				expect(typeof material.itemName).toBe('string');
				expect(typeof material.itemDesc).toBe('string');
				expect(Array.isArray(material.faction)).toBe(true);
				expect(material.faction.length).toBeGreaterThan(0);
			}
			expect(totalMaterials).toBeGreaterThan(0);
			expect(allMaterials.length).toBe(totalMaterials);
		});
	});

	describe('Fournis.Fournis - All Materials', () => {
		it('should load all materials', () => {
			expect(Array.isArray(fournis.Fournis)).toBe(true);
			expect(fournis.Fournis.length).toBeGreaterThan(0);
		});

		it('should have correct total count of materials', () => {
			const materialsPath = path.join(__dirname, '../../data/materials');
			let expectedCount = 0;
			for (const category of Object.keys(fournis.categories)) {
				const categoryPath = path.join(materialsPath, category);
				for (const subcategory of Object.keys(fournis.categories[category].subcategories)) {
					const filePath = path.join(categoryPath, `${subcategory}.json`);
					const materials = JSON.parse(fs.readFileSync(filePath, 'utf8'));
					expectedCount += materials.length;
				}
			}
			expect(fournis.Fournis.length).toBe(expectedCount);
		});

		it('should not have duplicate materials', () => {
			const materialNames = fournis.Fournis.map(m => m.itemName);
			const uniqueNames = new Set(materialNames);

			expect(materialNames.length).toBe(uniqueNames.size);
		});
	});

	describe('getMaterialsBySubcategory', () => {
		it('should return materials for a valid subcategory', () => {
			const materials = fournis.getMaterialsBySubcategory('utilities', 'tools');

			expect(Array.isArray(materials)).toBe(true);
		});

		it('should return empty array for non-existent subcategory', () => {
			const materials = fournis.getMaterialsBySubcategory('utilities', 'non_existent');

			expect(Array.isArray(materials)).toBe(true);
			expect(materials.length).toBe(0);
		});

		it('should return correct materials for small_arms', () => {
			const materials = fournis.getMaterialsBySubcategory('infantry_weapons', 'small_arms');

			expect(materials.length).toBeGreaterThan(0);

			// Vérifie que quelques armes connues sont présentes
			const materialNames = materials.map(m => m.itemName);
			expect(materialNames.some(name => name.includes('Rifle') || name.includes('rifle'))).toBe(true);
		});

		it('should return sorted materials (alphabetically)', () => {
			const materials = fournis.getMaterialsBySubcategory('utilities', 'tools');

			if (materials.length > 1) {
				for (let i = 1; i < materials.length; i++) {
					expect(materials[i].itemName.localeCompare(materials[i - 1].itemName)).toBeGreaterThanOrEqual(0);
				}
			}
		});
	});

	describe('getMaterialsByCategory', () => {
		it('should return all materials for a category', () => {
			const materials = fournis.getMaterialsByCategory('utilities');

			expect(Array.isArray(materials)).toBe(true);
			expect(materials.length).toBeGreaterThan(0);
		});

		it('should include materials from all subcategories', () => {
			const materials = fournis.getMaterialsByCategory('infantry_weapons');

			// Devrait contenir des matériels de plusieurs sous-catégories
			const subcategories = Object.keys(fournis.categories.infantry_weapons.subcategories);

			let foundSubcategories = 0;
			subcategories.forEach(subcategory => {
				const subcatMaterials = fournis.getMaterialsBySubcategory('infantry_weapons', subcategory);
				if (subcatMaterials.length > 0) {
					foundSubcategories++;
				}
			});

			expect(foundSubcategories).toBeGreaterThan(1);
		});

		it('should return empty array for non-existent category', () => {
			const materials = fournis.getMaterialsByCategory('non_existent');

			expect(Array.isArray(materials)).toBe(true);
			expect(materials.length).toBe(0);
		});
	});

	describe('Legacy Support', () => {
		it('should have legacy category icons', () => {
			expect(fournis).toHaveProperty('getSmallArms');
			expect(fournis).toHaveProperty('getHeavyArms');
			expect(fournis).toHaveProperty('getUtilities');
			expect(fournis).toHaveProperty('getVehicles');
			expect(fournis).toHaveProperty('getUniforms');
			expect(fournis).toHaveProperty('getResources');
			expect(fournis).toHaveProperty('getMedical');
		});
	});

	describe('Material Categories Distribution', () => {
		it('should have utilities category materials', () => {
			const materials = fournis.getMaterialsByCategory('utilities');
			expect(materials.length).toBeGreaterThan(0);
		});

		it('should have infantry_weapons category materials', () => {
			const materials = fournis.getMaterialsByCategory('infantry_weapons');
			expect(materials.length).toBeGreaterThan(0);
		});

		it('should have ammunition category materials', () => {
			const materials = fournis.getMaterialsByCategory('ammunition');
			expect(materials.length).toBeGreaterThan(0);
		});

		it('should have resources category materials', () => {
			const materials = fournis.getMaterialsByCategory('resources');
			expect(materials.length).toBeGreaterThan(0);
		});

		it('should have vehicles category materials', () => {
			const materials = fournis.getMaterialsByCategory('vehicles');
			expect(materials.length).toBeGreaterThan(0);
		});
	});

	describe('Specific Material Checks', () => {
		it('should have Basic Materials in resources/bmat', () => {
			const materials = fournis.getMaterialsBySubcategory('resources', 'bmat');
			const bmat = materials.find(m => m.itemName === 'Basic Materials');

			expect(bmat).toBeDefined();
			expect(bmat.itemCategory).toBe('resources');
		});

		it('should have Binoculars in utilities/tools', () => {
			const materials = fournis.getMaterialsBySubcategory('utilities', 'tools');
			const binoculars = materials.find(m => m.itemName === 'Binoculars');

			expect(binoculars).toBeDefined();
		});

		it('should have vehicles in vehicles/vehicles', () => {
			const materials = fournis.getMaterialsBySubcategory('vehicles', 'vehicles');

			expect(materials.length).toBeGreaterThan(0);
		});
	});
});
