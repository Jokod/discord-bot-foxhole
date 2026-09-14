'use strict';

const iconOverrides = require('./overrides/icons.json');

const WIKI_SCAN_CATEGORIES = [
	'Category:Ammunition',
	'Category:Firearms',
	'Category:Melee',
	'Category:Grenades',
	'Category:Launchers',
	'Category:Heavy Arms',
	'Category:Utility',
	'Category:Medical',
	'Category:Uniforms',
	'Category:Vehicles',
	'Category:Half-Tracks',
	// Aircraft live in typed subcats (not under Category:Vehicles as pages).
	'Category:Amphibious Fighter Aircraft',
	'Category:Amphibious Scout Aircraft',
	'Category:Dive Bomber Aircraft',
	'Category:Fighter Aircraft',
	'Category:Heavy Bomber Aircraft',
	'Category:Torpedo Bomber Aircraft',
	'Category:Transport Aircraft',
	'Category:Aircraft Parts',
	'Category:Shippable_Structures',
	'Category:Explosive_Charges',
];

const WIKI_EXTRA_SCAN_TITLES = [
	'A59 Venti \u201cPerdix\u201d',
	'Luminary Mk. VI Emissary',
];

const WIKI_HUB_TITLES = new Set([
	'Ammunition', 'Weapons', 'Vehicles', 'Resources', 'Materials', 'Utility', 'Medical',
	'Uniforms', 'Shippables', 'Structures', 'Production', 'Construction', 'Foxhole',
	'Firearms', 'Melee', 'Grenades', 'Launchers', 'Heavy Arms', 'Assault Rifle',
	'Rifle', 'Pistol', 'Sniper Rifle', 'Long Rifle', 'Secondary Weapons',
	'Aircraft',
	'R-Series Vehicles',
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

const WIKI_NOT_LOGISTICS_TITLES = new Set([
	'Fists',
	'Aircraft Part',
	'Damaged Colonial Aircraft Engine (Large)',
	'Damaged Colonial Aircraft Engine (Small)',
	'Damaged Colonial Aircraft Mechanical Parts (Large)',
	'Damaged Colonial Aircraft Mechanical Parts (Small)',
	'Damaged Warden Aircraft Engine (Large)',
	'Damaged Warden Aircraft Engine (Small)',
	'Damaged Warden Aircraft Mechanical Parts (Large)',
	'Damaged Warden Aircraft Mechanical Parts (Small)',
	'Diamon aK-5 \u201cHarpy\u201d',
]);

const WIKI_ICON_PAGE_OVERRIDES = iconOverrides;

const WIKI_COVERED_BY_CATALOG_HUBS = new Set([
	...Object.values(WIKI_ICON_PAGE_OVERRIDES),
	'Infantry Battledress',
	'Sapper Gear',
	'Physician\'s Jacket',
	'Outrider\'s Mantle',
	'Padded Boiler Suit',
	'Caoivish Parka',
	'Gunner\'s Breastplate',
	'Officer\'s Regalia',
	'Gentleman\'s Peacoat',
	'Cloudrunner\'s Vesture',
]);

module.exports = {
	WIKI_SCAN_CATEGORIES,
	WIKI_EXTRA_SCAN_TITLES,
	WIKI_HUB_TITLES,
	WIKI_NOT_LOGISTICS_TITLES,
	WIKI_ICON_PAGE_OVERRIDES,
	WIKI_COVERED_BY_CATALOG_HUBS,
};
