'use strict';

/** Named resource items → catalog JSON relPath + itemCategory. */
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

const VEHICLE_ROUTE = {
	relPath: 'vehicles/vehicles.json',
	itemCategory: 'vehicles',
};

/** Ordered item routes — first matching rule wins (after resources + vehicle). */
const ITEM_ROUTES = [
	{
		id: 'supplies-outfit',
		when: (f) => f.profile === 'Supplies' && f.type === 'Supplies',
		route: { relPath: 'utilities/outfits.json', itemCategory: 'outfits' },
	},
	{
		id: 'medical',
		when: (f) => f.cat === 'Medical' || f.itemCat === 'Medical',
		route: { relPath: 'utilities/medical.json', itemCategory: 'medical' },
	},
	{
		id: 'uniforms',
		when: (f) => f.cat === 'Uniforms' || f.itemCat === 'Uniforms' || f.type.includes('Uniform'),
		route: { relPath: 'utilities/uniforms.json', itemCategory: 'uniforms' },
	},
	{
		id: 'aircraft-parts',
		when: (f) => f.type === 'Aircraft Part' || f.cat === 'aircraft parts',
		route: { relPath: 'vehicles/aircraft_parts.json', itemCategory: 'vehicles' },
	},
	{
		id: 'grenades',
		when: (f) => f.profile === 'Throwable' && f.type === 'Grenade',
		route: { relPath: 'infantry_weapons/grenades.json', itemCategory: 'heavy_arms' },
	},
	{
		id: 'light-ammo',
		when: (f) => f.profile === 'LightAmmo',
		route: { relPath: 'ammunition/light_ammo.json', itemCategory: 'small_arms' },
	},
	{
		id: 'heavy-ammo',
		when: (f) => f.isHeavyAmmo,
		route: 'heavyAmmo',
	},
	{
		id: 'heavy-arms-mortar',
		when: (f) => f.cat === 'Heavy Arms' && f.type === 'Mortar' && f.profile === 'HandheldWeapon',
		route: { relPath: 'infantry_weapons/mortar.json', itemCategory: 'heavy_arms' },
	},
	{
		id: 'heavy-arms-launchers',
		when: (f) => f.cat === 'Heavy Arms'
			&& (f.type.includes('RPG') || f.type.includes('Launcher') || f.type.includes('Flame Torch')),
		route: { relPath: 'infantry_weapons/launchers.json', itemCategory: 'heavy_arms' },
	},
	{
		id: 'heavy-arms-default',
		when: (f) => f.cat === 'Heavy Arms',
		route: { relPath: 'infantry_weapons/heavy_arms.json', itemCategory: 'heavy_arms' },
	},
	{
		id: 'small-arms-lmg',
		when: (f) => f.cat === 'Small Arms' && f.type === 'Light Machine Gun',
		route: { relPath: 'infantry_weapons/machine_guns.json', itemCategory: 'heavy_arms' },
	},
	{
		id: 'small-arms-default',
		when: (f) => f.cat === 'Small Arms',
		route: { relPath: 'infantry_weapons/small_arms.json', itemCategory: 'small_arms' },
	},
	{
		id: 'flamethrower-ammo',
		when: (f) => f.profile === 'LiquidAmmo' && f.type === 'Flamethrower Ammo',
		route: { relPath: 'ammunition/flamethrower_ammo.json', itemCategory: 'heavy_arms' },
	},
	{
		id: 'utility-bayonet',
		when: (f) => f.cat === 'Utility'
			&& (f.type === 'Bayonet' || (f.profile === 'Accessory' && f.dmg === 'melee')),
		route: { relPath: 'infantry_weapons/melee_weapons.json', itemCategory: 'utilities' },
	},
	{
		id: 'utility-sea-mine',
		when: (f) => f.cat === 'Utility' && f.type === 'Sea Mine',
		route: null,
	},
	{
		id: 'utility-explosive-charge',
		when: (f) => f.cat === 'Utility' && f.type === 'Explosive Charge',
		route: { relPath: 'utilities/field_equipment.json', itemCategory: 'utilities' },
	},
	{
		id: 'utility-tools',
		when: (f) => f.cat === 'Utility'
			&& (f.profile === 'Tool' || f.type === 'Field Tool'),
		route: { relPath: 'utilities/tools.json', itemCategory: 'utilities' },
	},
	{
		id: 'utility-field-gear',
		when: (f) => f.cat === 'Utility'
			&& (f.type === 'Field Gear' || f.chassis === 'Field Gear'),
		route: { relPath: 'utilities/field_equipment.json', itemCategory: 'utilities' },
	},
	{
		id: 'utility-default',
		when: (f) => f.cat === 'Utility',
		route: { relPath: 'utilities/field_equipment.json', itemCategory: 'utilities' },
	},
];

/** Ordered heavy-ammo sub-routes — first match wins. */
const HEAVY_AMMO_ROUTES = [
	{
		id: 'mortar',
		when: (f) => f.chassis.includes('Mortar'),
		route: { relPath: 'ammunition/artillery_ammo.json', itemCategory: 'heavy_arms' },
	},
	{
		id: 'storm-rocket',
		when: (f) => f.chassis.includes('Storm Cannon') || f.chassis.includes('Rocket Pod'),
		route: { relPath: 'ammunition/artillery_ammo.json', itemCategory: 'heavy_arms' },
	},
	{
		id: 'torpedo',
		when: (f) => f.type === 'Torpedo' || f.chassis.includes('Torpedo'),
		route: { relPath: 'ammunition/misc_ammo.json', itemCategory: 'heavy_arms' },
	},
	{
		id: 'aamg',
		when: (f) => f.chassis.includes('Anti-Air Machine Gun'),
		route: { relPath: 'ammunition/aircraft_ammo.json', itemCategory: 'heavy_arms' },
	},
	{
		id: 'anti-aircraft',
		when: (f) => f.chassis.includes('Anti-Aircraft') || f.chassis.includes('Anti-Air'),
		route: (f) => (f.type === 'Magazine' || f.dmg === 'shrapnel')
			? { relPath: 'ammunition/aircraft_ammo.json', itemCategory: 'heavy_arms' }
			: { relPath: 'ammunition/tank_ammo.json', itemCategory: 'heavy_arms' },
	},
	{
		id: 'shrapnel-mag',
		when: (f) => f.dmg === 'shrapnel' && f.type === 'Magazine',
		route: { relPath: 'ammunition/aircraft_ammo.json', itemCategory: 'heavy_arms' },
	},
	{
		id: 'incendiary-flame',
		when: (f) => f.dmg === 'incendiary'
			&& (f.chassis.includes('Flamethrower') || f.chassis.includes('Flame')),
		route: { relPath: 'ammunition/flamethrower_ammo.json', itemCategory: 'heavy_arms' },
	},
	{
		id: 'shell-heavy',
		when: (f) => f.type === 'Shell' && f.cat === 'Heavy Ammunition',
		route: { relPath: 'ammunition/tank_ammo.json', itemCategory: 'heavy_arms' },
	},
	{
		id: 'propelled-rpg',
		when: (f) => f.type === 'Propelled Explosive' || f.chassis.includes('RPG'),
		route: { relPath: 'ammunition/misc_ammo.json', itemCategory: 'heavy_arms' },
	},
];

const HEAVY_AMMO_FALLBACK = {
	relPath: 'ammunition/misc_ammo.json',
	itemCategory: 'heavy_arms',
};

module.exports = {
	RESOURCE_NAME_TO_REL,
	VEHICLE_ROUTE,
	ITEM_ROUTES,
	HEAVY_AMMO_ROUTES,
	HEAVY_AMMO_FALLBACK,
};
