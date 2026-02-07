const { StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ActionRowBuilder } = require('discord.js');
const { Server } = require('./models');
const fs = require('fs');
const path = require('path');

// Main categories with their subcategories
const categories = {
	'utilities': {
		name: { en: 'Utilities', fr: 'Utilitaires' },
		icon: '🧰',
		subcategories: {
			'tools': { en: 'Tools', fr: 'Outils' },
			'field_equipment': { en: 'Field Equipment', fr: 'Matériel de terrain' },
			'mounted_equipment': { en: 'Mounted Equipment', fr: 'Matériel monté' },
			'medical': { en: 'Medical', fr: 'Soins' },
			'uniforms': { en: 'Uniforms', fr: 'Uniformes' },
			'outfits': { en: 'Outfits', fr: 'Tenues' }
		}
	},
	'infantry_weapons': {
		name: { en: 'Infantry Weapons', fr: 'Armes d\'infanterie' },
		icon: '🔫',
		subcategories: {
			'small_arms': { en: 'Small Arms', fr: 'Armes légères' },
			'melee_weapons': { en: 'Melee Weapons', fr: 'Armes de mêlée' },
			'machine_guns': { en: 'Machine Guns', fr: 'Mitrailleuses' },
			'heavy_arms': { en: 'Heavy Arms', fr: 'Armes lourdes diverses' },
			'grenades': { en: 'Grenades', fr: 'Grenades' },
			'launchers': { en: 'Launchers', fr: 'Lanceurs' },
			'mortar': { en: 'Mortar', fr: 'Mortier' }
		}
	},
	'ammunition': {
		name: { en: 'Ammunition', fr: 'Munition' },
		icon: '💣',
		subcategories: {
			'light_ammo': { en: 'Light Ammunition', fr: 'Munitions légères' },
			'tank_ammo': { en: 'Tank Ammunition', fr: 'Munitions tank' },
			'aircraft_ammo': { en: 'Aircraft Ammunition', fr: 'Munitions avions' },
			'artillery_ammo': { en: 'Artillery Ammunition', fr: 'Munitions artillerie' },
			'misc_ammo': { en: 'Misc Ammunition', fr: 'Munitions diverses' },
			'flamethrower_ammo': { en: 'Flamethrower Ammunition', fr: 'Munitions lance flamme' }
		}
	},
	'resources': {
		name: { en: 'Resources', fr: 'Ressources' },
		icon: '📦',
		subcategories: {
			'bmat': { en: 'Basic Materials', fr: 'bmat' },
			'emat': { en: 'Explosive Materials', fr: 'emat' },
			'hemat': { en: 'Heavy Explosive Materials', fr: 'HEmat' },
			'rmat': { en: 'Refined Materials', fr: 'Rmat' },
			'gravel': { en: 'Gravel', fr: 'Gravel' }
		}
	},
	'vehicles': {
		name: { en: 'Vehicles', fr: 'Véhicule' },
		icon: '🚛',
		subcategories: {
			'vehicles': { en: 'Vehicles', fr: 'Véhicules' }
		}
	}
};

// Load all materials from the new structure
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

// Legacy support - map old categories to new ones
const categoryIcons = {
	'small_arms': '🔫',
	'heavy_arms': '💣',
	'utilities': '🧰',
	'shipables': '🚚',
	'vehicles': '🚛',
	'uniforms': '🪖',
	'resources': '📦',
	'medical': '🩺',
};

const names = {
	'small_arms': 'Small Arms',
	'heavy_arms': 'Heavy Arms',
	'utilities': 'Utilities',
	'shipables': 'Shipables',
	'vehicles': 'Vehicles',
	'uniforms': 'Uniforms',
	'resources': 'Resources',
	'medical': 'Medical',
};

const getIcon = (itemCategory) => categoryIcons[itemCategory] || '❓';

const getFournis = async (guildId) => {
	const server = await Server.findOne({ guild_id: guildId })
		.catch(err => console.error(err));

	if (!server) console.error('No server found for this operation');

	const datas = Object.values(Fournis).filter(value => value.faction.includes(server.camp));

	return { camp: server.camp, datas };
};

const createMenuOption = (item) => {
	const desc = item.itemDesc.length > 100 ? `${item.itemDesc.substring(0, 90)}...` : item.itemDesc;

	return new StringSelectMenuOptionBuilder()
		.setLabel(item.itemName)
		.setDescription(desc)
		.setValue(item.itemName)
		.setEmoji(getIcon(item.itemCategory));
};

const createStringSelectMenu = (category, options, camp, uniqueNumber) => {
	return new StringSelectMenuBuilder()
		.setCustomId(`select_logistics_add_material-${uniqueNumber}`)
		.setPlaceholder(`List #${uniqueNumber} of ${names[category]} for ${camp}`)
		.addOptions(options);
};

const setMenusByCategory = async (category, guildId) => {
	const { camp, datas } = await getFournis(guildId);

	const categoryItems = datas.filter(data => data.itemCategory === category);

	sortByAlphabeticalOrder(categoryItems);

	let uniqueNumber = 1;

	const groups = [];
	for (let i = 0; i < categoryItems.length; i += 25) {
		const group = categoryItems.slice(i, i + 25).map(createMenuOption);
		groups.push(
			createStringSelectMenu(
				category,
				group,
				camp,
				uniqueNumber++,
			),
		);
	}

	return groups;
};

const getCategoryActions = (category) => async (guildId) => {
	const menus = await setMenusByCategory(category, guildId);

	if (menus.length > 4) {
		console.error('Too many menus for one row');
		return;
	}

	return menus.map(menu => new ActionRowBuilder().addComponents(menu));
};

function sortByAlphabeticalOrder(items) {
	items.sort((a, b) => {
		const nameA = a.itemName.toLowerCase();
		const nameB = b.itemName.toLowerCase();

		if (nameA < nameB) return -1;
		if (nameA > nameB) return 1;
		return 0;
	});
}

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
	// Legacy support
	getSmallArms: getCategoryActions('small_arms'),
	getHeavyArms: getCategoryActions('heavy_arms'),
	getUtilities: getCategoryActions('utilities'),
	getShipables: getCategoryActions('shipables'),
	getVehicles: getCategoryActions('vehicles'),
	getUniforms: getCategoryActions('uniforms'),
	getResources: getCategoryActions('resources'),
	getMedical: getCategoryActions('medical'),
	
	// New structure
	categories,
	getMaterialsBySubcategory,
	getMaterialsByCategory,
	Fournis,
};
