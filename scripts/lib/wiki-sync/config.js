'use strict';

/** @see scripts/sync-wiki-materials.js (en-tête) pour l’usage npm et la politique wiki.gg */

const WIKI_API = 'https://foxhole.wiki.gg/api.php';
const USER_AGENT = 'CMR_Bot/1.0 (Discord bot; github; Foxhole materials sync; non-commercial)';
const BATCH_SIZE = 40;
const BATCH_DELAY_MS = 2000;

const PRUNE_CATALOG_ITEM_NAMES = new Set([
	'Mortar Flare Shell',
	'Mortar Shrapnel Shell',
	'AP/RPG',
	'ARC/RPG',
	'Molten Wind',
	'Molten Wind v.II Flame Torch',
]);

const ITEM_REHOME_TO_REL = new Map([
	['\u201cMolten Wind\u201d v.II Ammo', 'ammunition/flamethrower_ammo.json'],
]);

const WIKI_TITLE_OVERRIDES = {
	'KRN886-127 Gast': 'KRN886-127 Gast Machine Gun',
	'Tremola Grenade': 'Tremola Grenade GPb-1',
	'85k-a "Spatha"': '85K-a \u201cSpatha\u201d',
	'RR-3 "Stolon" Tanker.': 'RR-3 \u201cStolon\u201d Tanker',
	'Dunne Caravaner 2F': 'Dunne Caravaner 2f',
	// Ancien canon retiré du jeu : plus de page dédiée ; texte aligné sur le Smelter 40mm actuel.
	'68-45 "Smelter" Heavy Field Gun': '40-45 \u201cSmelter\u201d Heavy Field Gun',
	// Fautes / anciennes entrées JSON (guillemets DAE non fermés) — compatibilité sync
	'BMS - Universal Assemly Rig': 'BMS - Universal Assembly Rig',
	'DAE 1b-2 \u201cSerra': 'DAE 1b-2 \u201cSerra\u201d',
	'DAE 1o-3 \u201cPolybolos': 'DAE 1o-3 \u201cPolybolos\u201d',
	// Titre page wiki (guillemets typographiques) ; « Molten Wind » seul redirige vers l’arme.
	'Molten Wind v.II Flame Torch': '\u201cMolten Wind\u201d v.II Flame Torch',
};

const WIKI_HUB_TITLES = new Set([
	'Ammunition', 'Weapons', 'Vehicles', 'Resources', 'Materials', 'Utility', 'Medical',
	'Uniforms', 'Shippables', 'Structures', 'Production', 'Construction', 'Foxhole',
	'Firearms', 'Melee', 'Grenades', 'Launchers', 'Heavy Arms', 'Assault Rifle',
	'Rifle', 'Pistol', 'Sniper Rifle', 'Long Rifle', 'Secondary Weapons',
	'Aircraft',
	'Anti-Tank RPG',
	'Anti-Tank Rifle',
	'Armoured Fighting Vehicles',
	'Colonial Vehicles',
	'Common Vehicles',
	'Field Weapons',
	'Flamethrower',
	'Flamethrower Ammo',
	'Grenade Launcher',
	'HE Grenade',
	'Health',
	'Heavy Rifle',
	'Land Vehicles',
	'Large Ships',
	'Light Machine Gun',
	'Machine Gun',
	'Melee Weapon',
	'Mounted Anti-Tank RPG',
	'Mounted Anti-Tank Rifle',
	'Mounted Grenade Launcher',
	'Mounted Infantry Support Gun',
	'Mounted Machine Gun',
	'Mounted RPG Launcher',
	'Mounted Weapons',
	'RPG Launcher',
	'Revolver',
	'Ships',
	'Shotgun',
	'Status Effects',
	'Submachine Gun',
	'Tanks',
	'Trains',
	'Vehicle Health',
	'Warden Vehicles',
	'Weight',
]);

const WIKI_SCAN_CATEGORIES = [
	'Category:Ammunition',
	'Category:Firearms',
	'Category:Melee',
	'Category:Grenades',
	'Category:Launchers',
	'Category:Heavy Arms',
	'Category:Utility',
	'Category:Medical',
	'Category:Vehicles',
];

const WIKI_NOT_LOGISTICS_TITLES = new Set([
	'Fists',
]);

const RESOURCE_NAME_TO_REL = {
	'Basic Materials': { relPath: 'resources/bmat.json', itemCategory: 'resources' },
	'Salvage': { relPath: 'resources/salvage.json', itemCategory: 'resources' },
	'Diesel': { relPath: 'resources/fuel.json', itemCategory: 'resources' },
	'Petrol': { relPath: 'resources/fuel.json', itemCategory: 'resources' },
	'Coal': { relPath: 'resources/coal.json', itemCategory: 'resources' },
	'Sulfur': { relPath: 'resources/sulfur.json', itemCategory: 'resources' },
	'Components': { relPath: 'resources/components.json', itemCategory: 'resources' },
	'Gravel': { relPath: 'resources/gravel.json', itemCategory: 'resources' },
	'Refined Materials': { relPath: 'resources/rmat.json', itemCategory: 'resources' },
	'Explosive Powder': { relPath: 'resources/emat.json', itemCategory: 'resources' },
	'Heavy Explosive Powder': { relPath: 'resources/hemat.json', itemCategory: 'resources' },
};

module.exports = {
	WIKI_API,
	USER_AGENT,
	BATCH_SIZE,
	BATCH_DELAY_MS,
	PRUNE_CATALOG_ITEM_NAMES,
	ITEM_REHOME_TO_REL,
	WIKI_TITLE_OVERRIDES,
	WIKI_HUB_TITLES,
	WIKI_SCAN_CATEGORIES,
	WIKI_NOT_LOGISTICS_TITLES,
	RESOURCE_NAME_TO_REL,
};
