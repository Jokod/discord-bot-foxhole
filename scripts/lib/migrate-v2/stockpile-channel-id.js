'use strict';

/**
 * Copy stockpile group_id → channel_id when needed, then unset group_id.
 * @param {import('mongodb').Db} db
 * @param {{ dryRun?: boolean }} options
 */
async function migrateStockpileChannelId(db, { dryRun = false } = {}) {
	const stockpiles = db.collection('stockpiles');

	const needCopy = await stockpiles.countDocuments({
		group_id: { $exists: true },
		$or: [
			{ channel_id: { $exists: false } },
			{ channel_id: null },
			{ channel_id: '' },
		],
	});

	const bothPresent = await stockpiles.countDocuments({
		group_id: { $exists: true },
		channel_id: { $exists: true, $nin: [null, ''] },
	});

	if (!dryRun) {
		if (needCopy > 0) {
			const docs = await stockpiles.find({
				group_id: { $exists: true },
				$or: [
					{ channel_id: { $exists: false } },
					{ channel_id: null },
					{ channel_id: '' },
				],
			}).toArray();

			for (const doc of docs) {
				await stockpiles.updateOne(
					{ _id: doc._id },
					{ $set: { channel_id: doc.group_id }, $unset: { group_id: '' } },
				);
			}
		}

		if (bothPresent > 0) {
			await stockpiles.updateMany(
				{
					group_id: { $exists: true },
					channel_id: { $exists: true, $nin: [null, ''] },
				},
				{ $unset: { group_id: '' } },
			);
		}
	}

	return {
		copiedGroupIdToChannelId: needCopy,
		unsetGroupIdOnly: bothPresent,
	};
}

module.exports = { migrateStockpileChannelId };
