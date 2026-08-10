'use strict';

const { ChannelType } = require('discord.js');
const { OrderBoard, TrackedMessage, Server } = require('../data/models.js');
const Translate = require('./translations.js');
const { MESSAGE_TYPE_BOARD } = require('../interactions/embeds/orderBoard.js');

/**
 * @param {string} guildId
 * @returns {Promise<boolean>}
 */
async function isOrderLogsEnabled(guildId) {
	if (!guildId) return false;
	const server = await Server.findOne({ guild_id: guildId }).lean();
	return Boolean(server?.logs);
}

/**
 * Creates a standalone locked log thread in the channel (not attached to the board message,
 * so the board embed/widget is not shown inside the thread).
 * No-op when server `logs` is false.
 * @param {import('discord.js').TextChannel} channel
 * @param {object} board
 * @param {Translate} translations
 */
async function createLogThread(channel, board, translations) {
	if (!(await isOrderLogsEnabled(board.guild_id))) return null;

	const name = translations.translate('ORDER_LOG_THREAD', { name: board.name }).slice(0, 100);
	const thread = await channel.threads.create({
		name,
		autoArchiveDuration: 10080,
		type: ChannelType.PublicThread,
		reason: 'Order board activity log',
	});
	// Locked = members can read only; bot (and mods with Manage Threads) can still post.
	await thread.setLocked(true, 'Order board log is read-only').catch(() => undefined);
	board.log_thread_id = thread.id;
	await OrderBoard.updateOne({ _id: board._id }, { log_thread_id: thread.id });
	return thread;
}

/**
 * @param {import('discord.js').TextChannel} channel
 * @param {import('discord.js').Client} client
 * @param {object} board
 */
async function bootstrapOrderLogThread(channel, client, board) {
	const translations = new Translate(client, board.guild_id);
	const tracked = await TrackedMessage.findOne({
		server_id: board.guild_id,
		message_type: `${MESSAGE_TYPE_BOARD}:${board._id}`,
	}).lean();
	if (!tracked?.message_id) return null;
	if (!channel?.threads?.create) return null;
	return createLogThread(channel, board, translations);
}

/**
 * @param {import('discord.js').Client} client
 * @param {object} board
 * @returns {Promise<import('discord.js').ThreadChannel|null>}
 */
async function resolveLogThread(client, board) {
	if (!board?.log_thread_id) return null;
	const channel = await client.channels.fetch(board.log_thread_id).catch(() => null);
	if (!channel || !channel.isThread?.()) {
		await OrderBoard.updateOne({ _id: board._id }, { log_thread_id: null }).catch(() => undefined);
		if (board.log_thread_id) board.log_thread_id = null;
		return null;
	}
	if (channel.archived) {
		await channel.setArchived(false).catch(() => undefined);
	}
	if (!channel.locked) {
		await channel.setLocked(true, 'Order board log is read-only').catch(() => undefined);
	}
	return channel;
}

/**
 * @param {import('discord.js').Client} client
 * @param {object} board
 * @param {string} content
 */
async function appendOrderLog(client, board, content) {
	if (!client || !board || !content) return false;
	if (!(await isOrderLogsEnabled(board.guild_id))) return false;
	const thread = await resolveLogThread(client, board);
	if (!thread) return false;
	await thread.send({ content: String(content).slice(0, 2000) }).catch(() => undefined);
	return true;
}

/**
 * Always deletes the Discord log thread (and all messages inside it) when `log_thread_id` is set,
 * even if server `logs` is false.
 * @param {import('discord.js').Client} client
 * @param {object} board
 */
async function deleteOrderLogThread(client, board) {
	if (!board?.log_thread_id || !client) return;
	const threadId = board.log_thread_id;
	const thread = await client.channels.fetch(threadId).catch(() => null);
	if (thread?.delete) {
		await thread.delete('Order board log removed').catch(() => undefined);
	}
	else if (typeof client.channels.delete === 'function') {
		await client.channels.delete(threadId, 'Order board log removed').catch(() => undefined);
	}
	board.log_thread_id = null;
	if (board._id) {
		await OrderBoard.updateOne({ _id: board._id }, { log_thread_id: null }).catch(() => undefined);
	}
}

/**
 * Delete every order log thread for a guild (e.g. when disabling logs in /server).
 * @param {import('discord.js').Client} client
 * @param {string} guildId
 */
async function deleteAllOrderLogThreads(client, guildId) {
	if (!client || !guildId) return;
	const boards = await OrderBoard.find({
		guild_id: guildId,
		log_thread_id: { $nin: [null, ''] },
	});
	for (const board of boards) {
		await deleteOrderLogThread(client, board);
	}
}

/**
 * Create missing log threads for every board in a guild (e.g. after enabling logs).
 * @param {import('discord.js').Client} client
 * @param {string} guildId
 */
async function ensureAllOrderLogThreads(client, guildId) {
	if (!client || !guildId) return { created: 0, skipped: 0 };
	const boards = await OrderBoard.find({
		guild_id: guildId,
		$or: [
			{ log_thread_id: null },
			{ log_thread_id: '' },
			{ log_thread_id: { $exists: false } },
		],
	});
	const translations = new Translate(client, guildId);
	let created = 0;
	let skipped = 0;
	for (const board of boards) {
		const channel = await client.channels.fetch(board.channel_id).catch(() => null);
		if (!channel?.threads?.create) {
			skipped += 1;
			continue;
		}
		try {
			const thread = await createLogThread(channel, board, translations);
			if (thread) created += 1;
			else skipped += 1;
		}
		catch {
			skipped += 1;
		}
	}
	return { created, skipped };
}

module.exports = {
	isOrderLogsEnabled,
	createLogThread,
	bootstrapOrderLogThread,
	resolveLogThread,
	appendOrderLog,
	deleteOrderLogThread,
	deleteAllOrderLogThreads,
	ensureAllOrderLogThreads,
};
