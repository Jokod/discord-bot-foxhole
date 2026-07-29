/**
 * One-time v2 migration: purge legacy logistics, migrate stockpile channel_id, clean stats.
 *
 *   node scripts/migrate-v2.js
 *   node scripts/migrate-v2.js --dry-run
 *
 * Requires .env with MONGODB_URL and MONGODB_NAME.
 */
'use strict';

require('dotenv').config();
const mongoose = require('mongoose');
const { purgeLogistics } = require('./lib/migrate-v2/purge-logistics.js');
const { migrateStockpileChannelId } = require('./lib/migrate-v2/stockpile-channel-id.js');
const { cleanupStats } = require('./lib/migrate-v2/stats-cleanup.js');

const MONGODB_URL = process.env.MONGODB_URL || 'mongodb://localhost:27017';
const MONGODB_NAME = process.env.MONGODB_NAME || 'foxhole-bot';

async function run() {
	const dryRun = process.argv.includes('--dry-run');
	console.log(`[migrate-v2] Connecting to ${MONGODB_URL}/${MONGODB_NAME} (dryRun=${dryRun})`);

	await mongoose.connect(`${MONGODB_URL}/${MONGODB_NAME}`);
	const db = mongoose.connection.db;

	console.log('[migrate-v2] Step 1/3 – purgeLogistics');
	const purgeResult = await purgeLogistics(db, { dryRun });
	console.log('[migrate-v2] purgeLogistics:', purgeResult);

	console.log('[migrate-v2] Step 2/3 – migrateStockpileChannelId');
	const channelResult = await migrateStockpileChannelId(db, { dryRun });
	console.log('[migrate-v2] migrateStockpileChannelId:', channelResult);

	console.log('[migrate-v2] Step 3/3 – cleanupStats');
	const statsResult = await cleanupStats(db, { dryRun });
	console.log('[migrate-v2] cleanupStats:', statsResult);

	await mongoose.disconnect();
	console.log('[migrate-v2] Done.');
	process.exit(0);
}

run().catch((err) => {
	console.error('[migrate-v2] Failed:', err);
	process.exit(1);
});
