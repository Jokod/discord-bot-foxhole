'use strict';

const { isValidTrackedType } = require('./constants.js');

/**
 * Purge inventory-era Stock/Material collections and obsolete tracked messages,
 * plus legacy groups if still present.
 * @param {import('mongodb').Db} db
 * @param {{ dryRun?: boolean }} options
 */
async function purgeLogistics(db, { dryRun = false } = {}) {
	const materials = db.collection('materials');
	const materialsCount = await materials.countDocuments();
	let materialsDeleted = materialsCount;
	if (!dryRun && materialsCount > 0) {
		const res = await materials.deleteMany({});
		materialsDeleted = res.deletedCount ?? materialsCount;
	}

	const stocks = db.collection('stocks');
	const stocksCount = await stocks.countDocuments();
	let stocksDeleted = stocksCount;
	if (!dryRun && stocksCount > 0) {
		const res = await stocks.deleteMany({});
		stocksDeleted = res.deletedCount ?? stocksCount;
	}

	const groups = db.collection('groups');
	const groupsCount = await groups.countDocuments().catch(() => 0);
	let groupsDropped = false;
	if (groupsCount > 0 || (await db.listCollections({ name: 'groups' }).hasNext())) {
		groupsDropped = true;
		if (!dryRun) {
			await groups.drop().catch((err) => {
				if (err?.codeName !== 'NamespaceNotFound') throw err;
				groupsDropped = false;
			});
		}
	}

	const tracked = db.collection('trackedmessages');
	const allTracked = await tracked.find({}).toArray();
	const obsoleteTracked = allTracked.filter((doc) => !isValidTrackedType(doc.message_type));
	const trackedDeleted = obsoleteTracked.length;

	if (!dryRun && trackedDeleted > 0) {
		await tracked.deleteMany({
			_id: { $in: obsoleteTracked.map((doc) => doc._id) },
		});
	}

	return {
		materialsDeleted,
		stocksDeleted,
		groupsDropped,
		groupsCount,
		trackedDeleted,
	};
}

module.exports = { purgeLogistics };
