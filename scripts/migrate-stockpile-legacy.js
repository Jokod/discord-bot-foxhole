/**
 * One-time migration: add new required fields to stockpile documents
 * that only have id, server_id, name, password (legacy schema).
 *
 * Run once after deploying the new stockpile schema:
 *   node scripts/migrate-stockpile-legacy.js
 *
 * Requires .env with MONGODB_URL and MONGODB_NAME.
 */

require('dotenv').config();
const mongoose = require('mongoose');

const MONGODB_URL = process.env.MONGODB_URL || 'mongodb://localhost:27017';
const MONGODB_NAME = process.env.MONGODB_NAME || 'foxhole-bot';

const LEGACY_REGION = 'Unknown';
const LEGACY_CITY = 'Unknown';
const LEGACY_GROUP_ID = 'legacy';
const LEGACY_OWNER_ID = '0';

async function run() {
	await mongoose.connect(`${MONGODB_URL}/${MONGODB_NAME}`);
	const db = mongoose.connection.db;
	const collection = db.collection('stockpiles');

	const now = new Date();
	const twoDaysMs = 2 * 24 * 60 * 60 * 1000;
	const expiresAt = new Date(now.getTime() + twoDaysMs);

	const result = await collection.updateMany(
		{ region: { $exists: false } },
		{
			$set: {
				region: LEGACY_REGION,
				city: LEGACY_CITY,
				group_id: LEGACY_GROUP_ID,
				owner_id: LEGACY_OWNER_ID,
				lastResetAt: now,
				expiresAt,
				deleted: false,
				expiry_reminders_sent: [],
			},
		},
	);

	console.log(`Done: ${result.modifiedCount} stockpile(s) updated.`);
	if (result.matchedCount > 0) {
		console.log(`Legacy stocks: region/city="${LEGACY_REGION}", group_id="${LEGACY_GROUP_ID}", owner_id="${LEGACY_OWNER_ID}".`);
		console.log('Anyone can remove or restore these (no creator). To set real region/city: remove then re-add via /stockpile add.');
	}
	else {
		console.log('No legacy documents found.');
	}

	await mongoose.disconnect();
	process.exit(0);
}

run().catch((err) => {
	console.error(err);
	process.exit(1);
});
