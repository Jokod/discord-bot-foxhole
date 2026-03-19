'use strict';

const { routeWikiInfoboxToMaterialFile } = require('../../../scripts/lib/wiki-sync/wiki-route');

function itemFields(fields) {
	return { kind: 'Item', fields };
}

describe('wiki-sync / wiki-route', () => {
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
});
