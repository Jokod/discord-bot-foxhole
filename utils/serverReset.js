'use strict';

const { OrderBoard, Operation, Stockpile } = require('../data/models.js');
const { deleteBoard } = require('../services/order/index.js');
const { refreshTrackedStockpileLists } = require('./stockpileListSync.js');

/**
 * @param {string} guildId
 * @returns {Promise<{ boards: number, stockpiles: number, operations: number }>}
 */
async function previewServerWarData(guildId) {
	if (!guildId) return { boards: 0, stockpiles: 0, operations: 0 };
	const [boards, stockpiles, operations] = await Promise.all([
		OrderBoard.countDocuments({ guild_id: guildId }),
		Stockpile.countDocuments({ server_id: guildId }),
		Operation.countDocuments({ guild_id: guildId }),
	]);
	return { boards, stockpiles, operations };
}

/**
 * Reset guild content for a new war: order boards (+ Discord), stockpiles, operations.
 * Keeps server config, notifications, and stats.
 *
 * @param {import('discord.js').Client} client
 * @param {string} guildId
 * @returns {Promise<{ boards: number, stockpiles: number, operations: number }>}
 */
async function resetServerWarData(client, guildId) {
	if (!client || !guildId) {
		return { boards: 0, stockpiles: 0, operations: 0 };
	}

	const boards = await OrderBoard.find({ guild_id: guildId });
	let boardsDeleted = 0;
	for (const board of boards) {
		let channel = null;
		if (board.channel_id) {
			channel = await client.channels.fetch(board.channel_id).catch(() => null);
		}
		await deleteBoard(board, channel, client);
		boardsDeleted += 1;
	}

	const stockResult = await Stockpile.deleteMany({ server_id: guildId });
	await refreshTrackedStockpileLists(client, { guildIds: [guildId] }).catch(() => 0);

	const operations = await Operation.find({ guild_id: guildId }).lean();
	for (const op of operations) {
		if (!op.channel_id || !op.operation_id) continue;
		try {
			const channel = await client.channels.fetch(op.channel_id).catch(() => null);
			if (!channel?.isTextBased?.()) continue;
			const msg = await channel.messages.fetch(op.operation_id).catch(() => null);
			if (msg) await msg.delete().catch(() => undefined);
		}
		catch {
			// best-effort Discord cleanup
		}
	}
	const opResult = await Operation.deleteMany({ guild_id: guildId });

	return {
		boards: boardsDeleted,
		stockpiles: stockResult.deletedCount ?? 0,
		operations: opResult.deletedCount ?? 0,
	};
}

module.exports = { previewServerWarData, resetServerWarData };
