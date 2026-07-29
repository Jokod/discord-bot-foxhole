'use strict';

/** Tracked message types kept after order pivot (exact match or prefix ending with ':'). */
const VALID_TRACKED_TYPES_PREFIXES = ['stockpile_list', 'order_board:'];

/** Slash command names removed (stats keys to prune). */
const OBSOLETE_SLASH_COMMANDS = [
	'logistics',
	'material',
	'foxhole',
	'create_operation',
	'notification',
	'stock',
];

/**
 * Legacy logistics materials OR inventory-era materials (anything in `materials` collection).
 * After the order pivot, OrderLine lives in `orderlines` — drop all `materials`.
 * @param {object} doc
 * @returns {boolean}
 */
function isLegacyMaterial() {
	return true;
}

/**
 * @param {string} type
 * @returns {boolean}
 */
function isValidTrackedType(type) {
	if (typeof type !== 'string' || type.length === 0) return false;
	return VALID_TRACKED_TYPES_PREFIXES.some((prefix) => {
		if (prefix.endsWith(':')) return type.startsWith(prefix);
		return type === prefix;
	});
}

module.exports = {
	VALID_TRACKED_TYPES_PREFIXES,
	OBSOLETE_SLASH_COMMANDS,
	isLegacyMaterial,
	isValidTrackedType,
};
