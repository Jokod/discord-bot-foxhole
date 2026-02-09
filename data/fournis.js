const fs = require('fs');
const path = require('path');

// Génère les catégories à partir de la structure de fichiers de data/materials
const buildCategories = () => {
	const materialsPath = path.join(__dirname, 'materials');

	// Icônes des catégories principales (métadonnées métier, pas dans le FS)
	const categoryIcons = {
		'utilities': '🧰',
		'infantry_weapons': '🔫',
		'ammunition': '💣',
		'resources': '📦',
		'vehicles': '🚛',
	};

	const categories = {};

	// Chaque dossier dans data/materials est une catégorie (triées alpha)
	const categoryDirs = fs.readdirSync(materialsPath, { withFileTypes: true })
		.filter(entry => entry.isDirectory())
		.map(entry => entry.name)
		.sort();

	categoryDirs.forEach(categoryName => {
		const categoryPath = path.join(materialsPath, categoryName);

		// Chaque fichier .json dans la catégorie est une sous-catégorie (triées alpha)
		const subcategories = {};
		const files = fs.readdirSync(categoryPath, { withFileTypes: true })
			.filter(entry => entry.isFile() && entry.name.endsWith('.json'))
			.map(entry => entry.name)
			.sort();

		files.forEach(fileName => {
			const subcategoryName = fileName.replace(/\.json$/, '');
			subcategories[subcategoryName] = {};
		});

		categories[categoryName] = {
			icon: categoryIcons[categoryName] || '📦',
			subcategories,
		};
	});

	return categories;
};

const categories = buildCategories();

const loadMaterials = () => {
	const allMaterials = [];
	const materialsPath = path.join(__dirname, 'materials');

	Object.keys(categories).forEach(category => {
		const categoryPath = path.join(materialsPath, category);

		Object.keys(categories[category].subcategories).forEach(subcategory => {
			const filePath = path.join(categoryPath, `${subcategory}.json`);

			if (fs.existsSync(filePath)) {
				const materials = JSON.parse(fs.readFileSync(filePath, 'utf8'));
				allMaterials.push(...materials);
			}
		});
	});

	return allMaterials;
};

const Fournis = loadMaterials();
// Function to get materials by subcategory
const getMaterialsBySubcategory = (category, subcategory) => {
	const filePath = path.join(__dirname, 'materials', category, `${subcategory}.json`);

	if (fs.existsSync(filePath)) {
		return JSON.parse(fs.readFileSync(filePath, 'utf8'));
	}

	return [];
};

// Function to get materials by category (all subcategories)
const getMaterialsByCategory = (category) => {
	const materials = [];

	if (categories[category] && categories[category].subcategories) {
		Object.keys(categories[category].subcategories).forEach(subcategory => {
			materials.push(...getMaterialsBySubcategory(category, subcategory));
		});
	}

	return materials;
};

module.exports = {
	categories,
	getMaterialsBySubcategory,
	getMaterialsByCategory,
	Fournis,
};
