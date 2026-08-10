'use strict';

const { OBSOLETE_SLASH_COMMANDS } = require('./constants.js');

/**
 * Clean obsolete stats fields / breakdown keys.
 * @param {import('mongodb').Db} db
 * @param {{ dryRun?: boolean }} options
 */
async function cleanupStats(db, { dryRun = false } = {}) {
	const stats = db.collection('stats');
	const docs = await stats.find({}).toArray();

	let docsTouched = 0;
	let keysPruned = 0;
	let materialValidatedUnset = 0;

	for (const doc of docs) {
		const unset = {};
		const set = {};
		let changed = false;

		if (Object.prototype.hasOwnProperty.call(doc, 'material_validated_count')) {
			unset.material_validated_count = '';
			materialValidatedUnset += 1;
			changed = true;
		}

		const breakdown = doc.command_breakdown && typeof doc.command_breakdown === 'object'
			? { ...doc.command_breakdown }
			: null;
		const lastByType = doc.last_command_by_type && typeof doc.last_command_by_type === 'object'
			? { ...doc.last_command_by_type }
			: null;

		if (breakdown) {
			let pruned = false;
			for (const key of OBSOLETE_SLASH_COMMANDS) {
				if (Object.prototype.hasOwnProperty.call(breakdown, key)) {
					delete breakdown[key];
					keysPruned += 1;
					pruned = true;
				}
			}
			if (pruned) {
				set.command_breakdown = breakdown;
				changed = true;
			}
		}

		if (lastByType) {
			let pruned = false;
			for (const key of OBSOLETE_SLASH_COMMANDS) {
				if (Object.prototype.hasOwnProperty.call(lastByType, key)) {
					delete lastByType[key];
					keysPruned += 1;
					pruned = true;
				}
			}
			if (pruned) {
				set.last_command_by_type = lastByType;
				changed = true;
			}
		}

		if (!changed) continue;
		docsTouched += 1;

		if (!dryRun) {
			const update = {};
			if (Object.keys(set).length) update.$set = set;
			if (Object.keys(unset).length) update.$unset = unset;
			await stats.updateOne({ _id: doc._id }, update);
		}
	}

	return {
		docsTouched,
		keysPruned,
		materialValidatedUnset,
	};
}

module.exports = { cleanupStats };
