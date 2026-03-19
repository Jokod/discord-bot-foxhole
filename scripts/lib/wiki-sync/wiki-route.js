'use strict';

const { RESOURCE_NAME_TO_REL } = require('./config');

function routeResourceInfobox(name) {
	if (RESOURCE_NAME_TO_REL[name]) {
		return RESOURCE_NAME_TO_REL[name];
	}
	return null;
}

function routeWikiInfoboxToMaterialFile(parsed) {
	if (!parsed) {
		return null;
	}
	if (parsed.kind === 'Vehicle') {
		return { relPath: 'vehicles/vehicles.json', itemCategory: 'vehicles' };
	}

	const f = parsed.fields;
	const name = (f.name || '').trim();
	if (!name) {
		return null;
	}

	const cat = (f.category || '').trim();
	const type = (f.type || '').trim();
	const profile = (f.ItemProfileType || '').trim();
	const chassis = (f.ChassisName || '').trim();
	const itemCat = (f.ItemCategory || '').trim();
	const dmg = (f.damage_type || '').trim();

	const resourceHit = routeResourceInfobox(name);
	if (resourceHit) {
		return resourceHit;
	}

	if (profile === 'Supplies' && type === 'Supplies') {
		return { relPath: 'utilities/outfits.json', itemCategory: 'outfits' };
	}
	if (cat === 'Medical' || itemCat === 'Medical') {
		return { relPath: 'utilities/medical.json', itemCategory: 'medical' };
	}

	if (profile === 'Throwable' && type === 'Grenade') {
		return { relPath: 'infantry_weapons/grenades.json', itemCategory: 'heavy_arms' };
	}

	if (profile === 'LightAmmo') {
		return { relPath: 'ammunition/light_ammo.json', itemCategory: 'small_arms' };
	}

	if (profile === 'HeavyAmmo') {
		if (chassis.includes('Mortar')) {
			return { relPath: 'ammunition/artillery_ammo.json', itemCategory: 'heavy_arms' };
		}
		if (chassis.includes('Storm Cannon') || chassis.includes('Rocket Pod')) {
			return { relPath: 'ammunition/artillery_ammo.json', itemCategory: 'heavy_arms' };
		}
		if (chassis.includes('Anti-Aircraft') && type === 'Shell') {
			return { relPath: 'ammunition/tank_ammo.json', itemCategory: 'heavy_arms' };
		}
		if (chassis.includes('Anti-Air Machine Gun')) {
			return { relPath: 'ammunition/aircraft_ammo.json', itemCategory: 'heavy_arms' };
		}
		if (dmg === 'Shrapnel' && type === 'Magazine') {
			return { relPath: 'ammunition/aircraft_ammo.json', itemCategory: 'heavy_arms' };
		}
		if (dmg === 'Incendiary' && (chassis.includes('Flamethrower') || chassis.includes('Flame'))) {
			return { relPath: 'ammunition/flamethrower_ammo.json', itemCategory: 'heavy_arms' };
		}
		if (type === 'Shell' && cat === 'Heavy Ammunition') {
			return { relPath: 'ammunition/tank_ammo.json', itemCategory: 'heavy_arms' };
		}
		if (type === 'Propelled Explosive' || chassis.includes('RPG')) {
			return { relPath: 'ammunition/misc_ammo.json', itemCategory: 'heavy_arms' };
		}
		return { relPath: 'ammunition/misc_ammo.json', itemCategory: 'heavy_arms' };
	}

	if (cat === 'Heavy Arms') {
		if (type === 'Mortar' && profile === 'HandheldWeapon') {
			return { relPath: 'infantry_weapons/mortar.json', itemCategory: 'heavy_arms' };
		}
		if (type.includes('RPG') || type.includes('Launcher') || type.includes('Flame Torch')) {
			return { relPath: 'infantry_weapons/launchers.json', itemCategory: 'heavy_arms' };
		}
		return { relPath: 'infantry_weapons/heavy_arms.json', itemCategory: 'heavy_arms' };
	}

	if (cat === 'Small Arms') {
		if (type === 'Light Machine Gun') {
			return { relPath: 'infantry_weapons/machine_guns.json', itemCategory: 'heavy_arms' };
		}
		return { relPath: 'infantry_weapons/small_arms.json', itemCategory: 'small_arms' };
	}

	if (profile === 'LiquidAmmo' && type === 'Flamethrower Ammo') {
		return { relPath: 'ammunition/flamethrower_ammo.json', itemCategory: 'heavy_arms' };
	}

	if (cat === 'Utility') {
		if (type === 'Bayonet' || (profile === 'Accessory' && dmg === 'Melee')) {
			return { relPath: 'infantry_weapons/melee_weapons.json', itemCategory: 'utilities' };
		}
		if (profile === 'Tool' || type === 'Field Tool') {
			return { relPath: 'utilities/tools.json', itemCategory: 'utilities' };
		}
		if (type === 'Field Gear' || chassis === 'Field Gear') {
			return { relPath: 'utilities/field_equipment.json', itemCategory: 'utilities' };
		}
		return { relPath: 'utilities/field_equipment.json', itemCategory: 'utilities' };
	}

	return null;
}

module.exports = {
	routeWikiInfoboxToMaterialFile,
};
