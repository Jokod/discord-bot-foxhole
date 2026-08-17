'use strict';

const { routeWikiInfoboxToMaterialFile, isHeavyAmmoItem } = require('../../../scripts/lib/wiki-sync/wiki-route');

function itemFields(fields) {
	return { kind: 'Item', fields };
}

describe('wiki-sync / wiki-route', () => {
	it('isHeavyAmmoItem false sans HeavyAmmo dans flags', () => {
		expect(isHeavyAmmoItem({
			ItemFlags: 'Default',
			category: 'Misc',
		})).toBe(false);
	});

	it('routeHeavyAmmo fallback sans category explicite', () => {
		expect(routeWikiInfoboxToMaterialFile(itemFields({
			name: 'Generic Heavy',
			ItemProfileType: 'HeavyAmmo',
			type: 'Shell',
		}))).toEqual({
			relPath: 'ammunition/misc_ammo.json',
			itemCategory: 'heavy_arms',
		});
	});

	it('isHeavyAmmoItem détecte ItemFlags HeavyAmmo', () => {
		expect(isHeavyAmmoItem({
			ItemFlags: 'Default,HeavyAmmo',
			category: 'Misc',
		})).toBe(true);
	});

	it('isHeavyAmmoItem détecte category Heavy Ammunition', () => {
		expect(isHeavyAmmoItem({ category: 'Heavy Ammunition' })).toBe(true);
	});

	it('routeResourceInfobox retourne null pour ressource inconnue', () => {
		expect(routeWikiInfoboxToMaterialFile(itemFields({ name: 'Unknown Resource XYZ' }))).toBeNull();
	});

	it('routeResourceInfobox mappe Diesel vers fuel.json', () => {
		expect(routeWikiInfoboxToMaterialFile(itemFields({ name: 'Diesel' }))).toEqual({
			relPath: 'resources/fuel.json',
			itemCategory: 'resources',
		});
	});

	it('retourne null si parsed null ou sans name', () => {
		expect(routeWikiInfoboxToMaterialFile(null)).toBeNull();
		expect(routeWikiInfoboxToMaterialFile(itemFields({ category: 'X' }))).toBeNull();
	});

	it('Vehicle → vehicles/vehicles.json', () => {
		expect(routeWikiInfoboxToMaterialFile({ kind: 'Vehicle', fields: { name: 'Tank' } })).toEqual({
			relPath: 'vehicles/vehicles.json',
			itemCategory: 'vehicles',
		});
	});

	it('ressource nommée → fichier resources dédié', () => {
		expect(routeWikiInfoboxToMaterialFile(itemFields({ name: 'Salvage' }))).toEqual({
			relPath: 'resources/salvage.json',
			itemCategory: 'resources',
		});
	});

	it('LightAmmo → light_ammo.json', () => {
		expect(routeWikiInfoboxToMaterialFile(itemFields({
			name: '9mm',
			ItemProfileType: 'LightAmmo',
		}))).toEqual({
			relPath: 'ammunition/light_ammo.json',
			itemCategory: 'small_arms',
		});
	});

	it('HeavyAmmo + chassis Mortar → artillery_ammo.json', () => {
		expect(routeWikiInfoboxToMaterialFile(itemFields({
			name: 'Mortar Shell',
			ItemProfileType: 'HeavyAmmo',
			ChassisName: 'Mortar Tube',
			category: 'Heavy Ammunition',
		}))).toEqual({
			relPath: 'ammunition/artillery_ammo.json',
			itemCategory: 'heavy_arms',
		});
	});

	it('HeavyAmmo via ItemCategory vide profile (Absol AA) → aircraft_ammo.json', () => {
		expect(routeWikiInfoboxToMaterialFile(itemFields({
			name: 'Absol Anti-Aircraft Rounds',
			ItemCategory: 'HeavyAmmo',
			ItemFlags: 'Default,HeavyAmmo',
			ItemProfileType: '',
			type: 'Magazine',
			ChassisName: 'Anti-Aircraft Ammo',
			category: 'Heavy Ammunition',
			damage_type: 'shrapnel',
		}))).toEqual({
			relPath: 'ammunition/aircraft_ammo.json',
			itemCategory: 'heavy_arms',
		});
	});

	it('HeavyAmmo Torpedo sans profile (Tenta) → misc_ammo.json', () => {
		expect(routeWikiInfoboxToMaterialFile(itemFields({
			name: 'Tenta Torpedo',
			ItemCategory: 'HeavyAmmo',
			ItemProfileType: '',
			type: 'Torpedo',
			ChassisName: 'Torpedo',
			category: 'Heavy Ammunition',
		}))).toEqual({
			relPath: 'ammunition/misc_ammo.json',
			itemCategory: 'heavy_arms',
		});
	});

	it('LiquidAmmo + Flamethrower Ammo → flamethrower_ammo.json', () => {
		expect(routeWikiInfoboxToMaterialFile(itemFields({
			name: '\u201cMolten Wind\u201d v.II Ammo',
			category: 'Utility',
			type: 'Flamethrower Ammo',
			ItemProfileType: 'LiquidAmmo',
		}))).toEqual({
			relPath: 'ammunition/flamethrower_ammo.json',
			itemCategory: 'heavy_arms',
		});
	});

	it('Heavy Arms + Flame Torch → launchers.json', () => {
		expect(routeWikiInfoboxToMaterialFile(itemFields({
			name: 'Torch',
			category: 'Heavy Arms',
			type: 'Flame Torch',
			ItemProfileType: 'HandheldWeapon',
		}))).toEqual({
			relPath: 'infantry_weapons/launchers.json',
			itemCategory: 'heavy_arms',
		});
	});

	it('Small Arms par défaut → small_arms.json', () => {
		expect(routeWikiInfoboxToMaterialFile(itemFields({
			name: 'Rifle',
			category: 'Small Arms',
			type: 'Rifle',
		}))).toEqual({
			relPath: 'infantry_weapons/small_arms.json',
			itemCategory: 'small_arms',
		});
	});

	it('Uniforms → utilities/uniforms.json', () => {
		expect(routeWikiInfoboxToMaterialFile(itemFields({
			name: 'Aviator\'s Raiment',
			category: 'Uniforms',
			ItemCategory: 'Uniforms',
			type: 'Pilot Uniform',
		}))).toEqual({
			relPath: 'utilities/uniforms.json',
			itemCategory: 'uniforms',
		});
	});

	it('Aircraft Part → vehicles/aircraft_parts.json', () => {
		expect(routeWikiInfoboxToMaterialFile(itemFields({
			name: 'Colonial Aircraft Engine (Small)',
			category: 'aircraft parts',
			ItemCategory: 'Parts',
			type: 'Aircraft Part',
			ItemProfileType: 'TorpedoAmmo',
			ChassisName: 'Aircraft Part',
		}))).toEqual({
			relPath: 'vehicles/aircraft_parts.json',
			itemCategory: 'vehicles',
		});
	});

	it('Utility par défaut → field_equipment.json', () => {
		expect(routeWikiInfoboxToMaterialFile(itemFields({
			name: 'Binoculars',
			category: 'Utility',
			type: 'Field Gear',
		}))).toEqual({
			relPath: 'utilities/field_equipment.json',
			itemCategory: 'utilities',
		});
	});

	describe('HeavyAmmo routing (table-driven)', () => {
		const heavyArms = { itemCategory: 'heavy_arms' };

		it.each([
			{
				label: 'Storm Cannon chassis → artillery_ammo.json',
				fields: {
					name: 'Storm Cannon Shell',
					ItemProfileType: 'HeavyAmmo',
					ChassisName: 'Storm Cannon',
					category: 'Heavy Ammunition',
				},
				expected: { relPath: 'ammunition/artillery_ammo.json', ...heavyArms },
			},
			{
				label: 'Rocket Pod chassis → artillery_ammo.json',
				fields: {
					name: 'Rocket Pod Ammo',
					ItemProfileType: 'HeavyAmmo',
					ChassisName: 'Rocket Pod',
					category: 'Heavy Ammunition',
				},
				expected: { relPath: 'ammunition/artillery_ammo.json', ...heavyArms },
			},
			{
				label: 'Anti-Aircraft chassis + Shell → tank_ammo.json',
				fields: {
					name: 'AA Shell',
					ItemProfileType: 'HeavyAmmo',
					type: 'Shell',
					ChassisName: 'Anti-Aircraft Cannon',
					category: 'Heavy Ammunition',
				},
				expected: { relPath: 'ammunition/tank_ammo.json', ...heavyArms },
			},
			{
				label: 'Anti-Air Machine Gun chassis → aircraft_ammo.json',
				fields: {
					name: 'AAMG Rounds',
					ItemProfileType: 'HeavyAmmo',
					ChassisName: 'Anti-Air Machine Gun',
					category: 'Heavy Ammunition',
				},
				expected: { relPath: 'ammunition/aircraft_ammo.json', ...heavyArms },
			},
			{
				label: 'shrapnel + Magazine sans chassis AA → aircraft_ammo.json',
				fields: {
					name: 'Shrapnel Mag',
					ItemProfileType: 'HeavyAmmo',
					type: 'Magazine',
					damage_type: 'shrapnel',
					category: 'Heavy Ammunition',
				},
				expected: { relPath: 'ammunition/aircraft_ammo.json', ...heavyArms },
			},
			{
				label: 'incendiary + Flame chassis → flamethrower_ammo.json',
				fields: {
					name: 'Flame Fuel',
					ItemProfileType: 'HeavyAmmo',
					damage_type: 'incendiary',
					ChassisName: 'Flame Thrower',
					category: 'Heavy Ammunition',
				},
				expected: { relPath: 'ammunition/flamethrower_ammo.json', ...heavyArms },
			},
			{
				label: 'Shell + category Heavy Ammunition → tank_ammo.json',
				fields: {
					name: 'Tank Shell',
					ItemProfileType: 'HeavyAmmo',
					type: 'Shell',
					category: 'Heavy Ammunition',
				},
				expected: { relPath: 'ammunition/tank_ammo.json', ...heavyArms },
			},
			{
				label: 'Propelled Explosive → misc_ammo.json',
				fields: {
					name: 'AT Rocket',
					ItemProfileType: 'HeavyAmmo',
					type: 'Propelled Explosive',
					category: 'Heavy Ammunition',
				},
				expected: { relPath: 'ammunition/misc_ammo.json', ...heavyArms },
			},
			{
				label: 'RPG chassis → misc_ammo.json',
				fields: {
					name: 'RPG Round',
					ItemProfileType: 'HeavyAmmo',
					ChassisName: 'RPG Launcher',
					category: 'Heavy Ammunition',
				},
				expected: { relPath: 'ammunition/misc_ammo.json', ...heavyArms },
			},
			{
				label: 'HeavyAmmo generic fallback → misc_ammo.json',
				fields: {
					name: 'Mystery Ammo',
					ItemProfileType: 'HeavyAmmo',
					category: 'Heavy Ammunition',
				},
				expected: { relPath: 'ammunition/misc_ammo.json', ...heavyArms },
			},
		])('$label', ({ fields, expected }) => {
			expect(routeWikiInfoboxToMaterialFile(itemFields(fields))).toEqual(expected);
		});
	});

	describe('item category routing (table-driven)', () => {
		it.each([
			{
				label: 'Supplies outfit → utilities/outfits.json',
				fields: {
					name: 'Soldier Outfit',
					ItemProfileType: 'Supplies',
					type: 'Supplies',
				},
				expected: { relPath: 'utilities/outfits.json', itemCategory: 'outfits' },
			},
			{
				label: 'Medical category → medical.json',
				fields: {
					name: 'Bandage',
					category: 'Medical',
				},
				expected: { relPath: 'utilities/medical.json', itemCategory: 'medical' },
			},
			{
				label: 'Throwable Grenade → grenades.json',
				fields: {
					name: 'Frag Grenade',
					ItemProfileType: 'Throwable',
					type: 'Grenade',
				},
				expected: { relPath: 'infantry_weapons/grenades.json', itemCategory: 'heavy_arms' },
			},
			{
				label: 'Mortar handheld Heavy Arms → mortar.json',
				fields: {
					name: 'Mortar',
					category: 'Heavy Arms',
					type: 'Mortar',
					ItemProfileType: 'HandheldWeapon',
				},
				expected: { relPath: 'infantry_weapons/mortar.json', itemCategory: 'heavy_arms' },
			},
			{
				label: 'Heavy Arms default → heavy_arms.json',
				fields: {
					name: 'Machine Gun',
					category: 'Heavy Arms',
					type: 'Machine Gun',
					ItemProfileType: 'HandheldWeapon',
				},
				expected: { relPath: 'infantry_weapons/heavy_arms.json', itemCategory: 'heavy_arms' },
			},
			{
				label: 'Light Machine Gun Small Arms → machine_guns.json',
				fields: {
					name: 'Lewis Gun',
					category: 'Small Arms',
					type: 'Light Machine Gun',
				},
				expected: { relPath: 'infantry_weapons/machine_guns.json', itemCategory: 'heavy_arms' },
			},
			{
				label: 'Bayonet Utility → melee_weapons.json',
				fields: {
					name: 'Bayonet',
					category: 'Utility',
					type: 'Bayonet',
				},
				expected: { relPath: 'infantry_weapons/melee_weapons.json', itemCategory: 'utilities' },
			},
			{
				label: 'melee accessory Utility → melee_weapons.json',
				fields: {
					name: 'Trench Club',
					category: 'Utility',
					ItemProfileType: 'Accessory',
					damage_type: 'Melee',
				},
				expected: { relPath: 'infantry_weapons/melee_weapons.json', itemCategory: 'utilities' },
			},
			{
				label: 'Field Tool Utility → tools.json',
				fields: {
					name: 'Shovel',
					category: 'Utility',
					type: 'Field Tool',
				},
				expected: { relPath: 'utilities/tools.json', itemCategory: 'utilities' },
			},
			{
				label: 'Tool profile Utility → tools.json',
				fields: {
					name: 'Hammer',
					category: 'Utility',
					ItemProfileType: 'Tool',
				},
				expected: { relPath: 'utilities/tools.json', itemCategory: 'utilities' },
			},
			{
				label: 'Utility unknown type → field_equipment.json',
				fields: {
					name: 'Unknown Gear',
					category: 'Utility',
					type: 'Misc',
				},
				expected: { relPath: 'utilities/field_equipment.json', itemCategory: 'utilities' },
			},
			{
				label: 'unmatched item → null',
				fields: {
					name: 'Mystery Item',
					category: 'Unknown',
				},
				expected: null,
			},
		])('$label', ({ fields, expected }) => {
			expect(routeWikiInfoboxToMaterialFile(itemFields(fields))).toEqual(expected);
		});
	});
});
