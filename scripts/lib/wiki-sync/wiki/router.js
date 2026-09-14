'use strict';

const {
	RESOURCE_NAME_TO_REL,
	VEHICLE_ROUTE,
	ITEM_ROUTES,
	HEAVY_AMMO_ROUTES,
	HEAVY_AMMO_FALLBACK,
} = require('../config/routing/rules');

function normalizeItemFields(fields) {
	const cat = (fields.category || '').trim();
	const type = (fields.type || '').trim();
	const profile = (fields.ItemProfileType || '').trim();
	const chassis = (fields.ChassisName || '').trim();
	const itemCat = (fields.ItemCategory || '').trim();
	const dmg = (fields.damage_type || '').trim();
	const flags = (fields.ItemFlags || '').trim();
	const isHeavyAmmo = profile === 'HeavyAmmo'
		|| itemCat === 'HeavyAmmo'
		|| cat === 'Heavy Ammunition'
		|| flags.split(',').map((s) => s.trim()).includes('HeavyAmmo');

	return {
		cat,
		type,
		profile,
		chassis,
		itemCat,
		dmg: dmg.toLowerCase(),
		dmgRaw: dmg,
		isHeavyAmmo,
	};
}

function isHeavyAmmoItem(fields) {
	return normalizeItemFields(fields).isHeavyAmmo;
}

function routeHeavyAmmo(fields) {
	const f = normalizeItemFields(fields);

	for (const rule of HEAVY_AMMO_ROUTES) {
		if (!rule.when(f)) {
			continue;
		}
		if (typeof rule.route === 'function') {
			return rule.route(f);
		}
		return rule.route;
	}

	return HEAVY_AMMO_FALLBACK;
}

function routeResourceInfobox(name) {
	return RESOURCE_NAME_TO_REL[name] || null;
}

function routeWikiInfoboxToMaterialFile(parsed) {
	if (!parsed) {
		return null;
	}
	if (parsed.kind === 'Vehicle') {
		return { ...VEHICLE_ROUTE };
	}
	if (parsed.kind === 'Structure') {
		const sf = parsed.fields;
		const constructionType = (sf.construction_type || '').trim();
		const structureType = (sf.type || '').trim();
		if (constructionType === 'Shippable' && structureType === 'Storage') {
			return { relPath: 'utilities/shippables.json', itemCategory: 'utilities' };
		}
		return null;
	}

	const name = (parsed.fields.name || '').trim();
	if (!name) {
		return null;
	}

	const f = normalizeItemFields(parsed.fields);

	const resourceHit = routeResourceInfobox(name);
	if (resourceHit) {
		return resourceHit;
	}

	for (const rule of ITEM_ROUTES) {
		if (!rule.when(f)) {
			continue;
		}
		if (rule.route === 'heavyAmmo') {
			return routeHeavyAmmo(parsed.fields);
		}
		return rule.route;
	}

	return null;
}

module.exports = {
	isHeavyAmmoItem,
	routeHeavyAmmo,
	routeResourceInfobox,
	routeWikiInfoboxToMaterialFile,
};
