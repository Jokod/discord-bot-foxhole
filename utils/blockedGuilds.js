'use strict';

const mongoose = require('mongoose');

const COLLECTION = 'blocked_guilds';

/**
 * IDs from BLOCKED_GUILD_IDS env (comma-separated). Read-only from the dashboard UI.
 * @returns {Set<string>}
 */
function getEnvBlockedGuildIds() {
	const raw = process.env.BLOCKED_GUILD_IDS || '';
	return new Set(
		raw
			.split(',')
			.map((id) => id.trim())
			.filter(Boolean),
	);
}

function blockedCollection() {
	const db = mongoose.connection?.db;
	if (!db) return null;
	return db.collection(COLLECTION);
}

/**
 * @returns {Promise<Set<string>>}
 */
async function getMongoBlockedGuildIds() {
	const col = blockedCollection();
	if (!col) return new Set();
	const docs = await col.find({}).project({ _id: 1 }).toArray();
	return new Set(docs.map((d) => String(d._id)));
}

/**
 * Union of env + Mongo blocked guild IDs.
 * @returns {Promise<Set<string>>}
 */
async function getBlockedGuildIds() {
	const env = getEnvBlockedGuildIds();
	const mongo = await getMongoBlockedGuildIds();
	return new Set([...env, ...mongo]);
}

/**
 * @returns {Promise<Map<string, 'env'|'mongo'|'both'>>}
 */
async function getBlockedGuildDetails() {
	const env = getEnvBlockedGuildIds();
	const mongo = await getMongoBlockedGuildIds();
	const map = new Map();
	for (const id of env) {
		map.set(id, mongo.has(id) ? 'both' : 'env');
	}
	for (const id of mongo) {
		if (!map.has(id)) map.set(id, 'mongo');
	}
	return map;
}

/**
 * @param {string} guildId
 * @returns {Promise<'env'|'mongo'|'both'|null>}
 */
async function getBlockedSource(guildId) {
	const details = await getBlockedGuildDetails();
	return details.get(String(guildId)) || null;
}

/**
 * @param {string[]} ids
 * @param {{ reason?: string, by?: string }} [meta]
 * @returns {Promise<{ added: string[], already: string[] }>}
 */
async function addBlockedGuilds(ids, meta = {}) {
	const col = blockedCollection();
	if (!col) {
		const err = new Error('MongoDB not connected');
		err.status = 500;
		err.code = 'GUILD_DB';
		throw err;
	}
	const now = new Date();
	const added = [];
	const already = [];
	for (const raw of ids) {
		const id = String(raw || '').trim();
		if (!id) continue;
		const result = await col.updateOne(
			{ _id: id },
			{
				$setOnInsert: {
					_id: id,
					createdAt: now,
					reason: meta.reason || 'dashboard',
					by: meta.by || null,
				},
			},
			{ upsert: true },
		);
		if (result.upsertedCount > 0) added.push(id);
		else already.push(id);
	}
	return { added, already };
}

/**
 * Removes Mongo blacklist entries. Env-only IDs are skipped (still blocked).
 * @param {string[]} ids
 * @returns {Promise<{ removed: string[], skipped_env: string[], missing: string[] }>}
 */
async function removeBlockedGuilds(ids) {
	const col = blockedCollection();
	if (!col) {
		const err = new Error('MongoDB not connected');
		err.status = 500;
		err.code = 'GUILD_DB';
		throw err;
	}
	const env = getEnvBlockedGuildIds();
	const removed = [];
	const skipped_env = [];
	const missing = [];
	for (const raw of ids) {
		const id = String(raw || '').trim();
		if (!id) continue;
		const inMongo = await col.findOne({ _id: id });
		if (!inMongo) {
			if (env.has(id)) skipped_env.push(id);
			else missing.push(id);
			continue;
		}
		await col.deleteOne({ _id: id });
		removed.push(id);
		if (env.has(id)) skipped_env.push(id);
	}
	return { removed, skipped_env, missing };
}

module.exports = {
	COLLECTION,
	getEnvBlockedGuildIds,
	getMongoBlockedGuildIds,
	getBlockedGuildIds,
	getBlockedGuildDetails,
	getBlockedSource,
	addBlockedGuilds,
	removeBlockedGuilds,
};
