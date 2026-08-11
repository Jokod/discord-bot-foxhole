const { OrderBoard, OrderLine } = require('../../data/models.js');
const {
	allocateLineId,
	bootstrapOrderBoard,
	refreshOrderBoard,
	refreshOrderBoardDebounced,
	deleteOrderTrackedMessages,
} = require('../../utils/orderBoardSync.js');
const { deleteOrderLogThread } = require('../../utils/orderBoardLog.js');

const {
	DEFAULT_PRIORITY,
	normalizePriority,
	nextPriority,
	getPrioritySortRank,
} = require('../../utils/material-priority.js');
const { isValidOrderKind } = require('../../utils/order-kinds.js');
const { MAX_ORDER_LINES } = require('../../utils/order-limits.js');

const QTY_DELTAS = { m1: -1, p1: 1, p4: 4, p9: 9 };

function lineFilter(guildId, boardId, lineId) {
	return {
		guild_id: guildId,
		board_id: String(boardId),
		line_id: String(lineId),
	};
}

function toNonNegNumber(value) {
	return Math.max(0, Number(value) || 0);
}

function findBoardById(boardId, guildId) {
	if (!guildId) {
		throw new Error('findBoardById requires guildId');
	}
	return OrderBoard.findOne({ _id: boardId, guild_id: guildId });
}

function findBoardByChannelAndName(guildId, channelId, name) {
	return OrderBoard.findOne({ guild_id: guildId, channel_id: channelId, name });
}

function findBoardsByChannel(guildId, channelId) {
	return OrderBoard.find({ guild_id: guildId, channel_id: channelId }).sort({ name: 1 });
}

function mapDuplicateKeyError(err) {
	if (err?.code === 11000) {
		const mapped = new Error('ORDER_ALREADY_EXISTS');
		mapped.code = 'ORDER_ALREADY_EXISTS';
		throw mapped;
	}
	throw err;
}

async function createBoard({
	guildId,
	channelId,
	ownerId,
	name,
	kind,
	operationId = null,
	from = null,
	to = null,
	client,
	channel,
}) {
	if (!isValidOrderKind(kind)) {
		const err = new Error('ORDER_INVALID_KIND');
		err.code = 'ORDER_INVALID_KIND';
		throw err;
	}

	const existing = await findBoardByChannelAndName(guildId, channelId, name);
	if (existing) {
		const err = new Error('ORDER_ALREADY_EXISTS');
		err.code = 'ORDER_ALREADY_EXISTS';
		err.board = existing;
		throw err;
	}

	const fromValue = typeof from === 'string' ? from.trim() || null : null;
	const toValue = typeof to === 'string' ? to.trim() || null : null;

	let board;
	try {
		board = await OrderBoard.create({
			guild_id: guildId,
			name,
			channel_id: channelId,
			owner_id: ownerId,
			kind,
			operation_id: operationId || null,
			from: fromValue,
			to: toValue,
			status: 'open',
			page: 0,
			selected_line_id: null,
			next_line_number: 0,
		});
	}
	catch (err) {
		mapDuplicateKeyError(err);
	}

	if (client && channel) {
		try {
			await bootstrapOrderBoard(channel, client, board);
		}
		catch (err) {
			await OrderBoard.deleteOne({ _id: board._id }).catch(() => undefined);
			throw err;
		}
	}
	return board;
}

async function deleteBoard(board, channel = null, client = null) {
	const guildId = board.guild_id;
	const boardId = String(board._id);
	const resolvedClient = client ?? channel?.client ?? null;

	await OrderLine.deleteMany({ guild_id: guildId, board_id: boardId });
	if (resolvedClient) {
		await deleteOrderLogThread(resolvedClient, board);
	}
	await deleteOrderTrackedMessages(guildId, board._id, channel, resolvedClient);
	await OrderBoard.deleteOne({ _id: board._id });
	return board;
}

/**
 * Remove every order board linked to an operation (Discord messages + DB).
 * @param {string} guildId
 * @param {string} operationId
 * @param {import('discord.js').Client} [client]
 */
async function deleteBoardsByOperation(guildId, operationId, client = null) {
	if (!guildId || !operationId) return [];
	const boards = await OrderBoard.find({
		guild_id: guildId,
		operation_id: String(operationId),
	});
	const deleted = [];
	for (const board of boards) {
		let channel = null;
		if (client && board.channel_id) {
			channel = await client.channels.fetch(board.channel_id).catch(() => null);
		}
		await deleteBoard(board, channel, client);
		deleted.push(board);
	}
	return deleted;
}

async function closeBoard(board) {
	board.status = 'closed';
	await board.save();
	return board;
}

async function reopenBoard(board) {
	board.status = 'open';
	await board.save();
	return board;
}

async function setSelectedLine(board, lineId) {
	board.selected_line_id = lineId != null ? String(lineId) : null;
	await board.save();
	return board;
}

async function applyIncrement(guildId, boardId, lineId, delta) {
	const d = Number(delta) || 0;
	const filter = lineFilter(guildId, boardId, lineId);
	const previousDoc = await OrderLine.findOneAndUpdate(
		filter,
		[
			{
				$set: {
					current: {
						$max: [
							0,
							{
								$add: [
									{ $convert: { input: '$current', to: 'double', onError: 0, onNull: 0 } },
									d,
								],
							},
						],
					},
				},
			},
		],
		{ returnDocument: 'before', updatePipeline: true },
	);
	if (!previousDoc) return null;

	const previous = toNonNegNumber(previousDoc.current);
	const current = Math.max(0, previous + d);
	previousDoc.current = current;
	return { line: previousDoc, previous, current };
}

/** Set current = target (cap at target, never below current if already over). */
async function fillToTarget(guildId, boardId, lineId) {
	const filter = lineFilter(guildId, boardId, lineId);
	const previousDoc = await OrderLine.findOneAndUpdate(
		filter,
		[
			{
				$set: {
					current: {
						$max: [
							{ $convert: { input: '$current', to: 'double', onError: 0, onNull: 0 } },
							{ $convert: { input: '$target', to: 'double', onError: 0, onNull: 0 } },
						],
					},
				},
			},
		],
		{ returnDocument: 'before', updatePipeline: true },
	);
	if (!previousDoc) return null;

	const previous = toNonNegNumber(previousDoc.current);
	const target = toNonNegNumber(previousDoc.target);
	const current = Math.max(previous, target);
	previousDoc.current = current;
	return { line: previousDoc, previous, current };
}

async function cycleLinePriority(guildId, boardId, lineId) {
	const line = await OrderLine.findOne(lineFilter(guildId, boardId, lineId));
	if (!line) return null;
	const previous = line.priority;
	line.priority = nextPriority(line.priority);
	await line.save();
	return { line, previous, priority: line.priority };
}

async function correctLine(guildId, boardId, lineId, { current, target, priority }) {
	const line = await OrderLine.findOne(lineFilter(guildId, boardId, lineId));
	if (!line) return null;

	if (current !== undefined && current !== null) {
		line.current = toNonNegNumber(current);
	}
	if (target !== undefined && target !== null) {
		line.target = Math.max(1, Number(target) || 0);
	}
	if (priority !== undefined && priority !== null) {
		line.priority = normalizePriority(priority);
	}
	await line.save();
	return line;
}

async function deleteLine(guildId, boardId, lineId) {
	const result = await OrderLine.deleteOne(lineFilter(guildId, boardId, lineId));
	if (result.deletedCount > 0) {
		const board = await OrderBoard.findOne({ _id: boardId, guild_id: guildId });
		if (board && String(board.selected_line_id) === String(lineId)) {
			board.selected_line_id = null;
			await board.save();
		}
	}
	return result;
}

async function setDraft(board, userId, { name, category }) {
	if (!board.add_drafts) board.add_drafts = new Map();
	board.add_drafts.set(String(userId), { name, category });
	board.markModified('add_drafts');
	await board.save();
	return board;
}

function getDraft(board, userId) {
	const key = String(userId);
	if (board.add_drafts?.get) {
		return board.add_drafts.get(key) || null;
	}
	return null;
}

async function consumeDraft(board, userId) {
	const key = String(userId);
	let draft = null;
	if (board.add_drafts?.get) {
		draft = board.add_drafts.get(key) || null;
		if (draft) {
			board.add_drafts.delete(key);
			board.markModified('add_drafts');
			await board.save();
		}
	}
	return draft;
}

async function countLines(board) {
	return OrderLine.countDocuments({
		guild_id: board.guild_id,
		board_id: String(board._id),
	});
}

async function createLine(board, { name, category, target, ownerId, priority }) {
	const count = await countLines(board);
	if (count >= MAX_ORDER_LINES) {
		const err = new Error('ORDER_FULL');
		err.code = 'ORDER_FULL';
		throw err;
	}

	const lineId = await allocateLineId(board.guild_id, board._id);
	const line = await OrderLine.create({
		line_id: lineId,
		guild_id: board.guild_id,
		board_id: String(board._id),
		owner_id: ownerId,
		name,
		category,
		priority: normalizePriority(priority ?? DEFAULT_PRIORITY),
		current: 0,
		target: Math.max(1, Number(target) || 0),
	});

	const afterCount = await countLines(board);
	if (afterCount > MAX_ORDER_LINES) {
		await OrderLine.deleteOne({ _id: line._id });
		const err = new Error('ORDER_FULL');
		err.code = 'ORDER_FULL';
		throw err;
	}

	board.selected_line_id = lineId;
	if (typeof board.save === 'function') {
		await board.save();
	}
	else {
		await OrderBoard.updateOne({ _id: board._id }, { selected_line_id: lineId });
	}
	return line;
}

function sortLines(lines) {
	return [...(lines || [])].sort((a, b) => {
		const rank = getPrioritySortRank(a.priority) - getPrioritySortRank(b.priority);
		if (rank !== 0) return rank;
		return Number(a.line_id) - Number(b.line_id);
	});
}

async function listLines(board) {
	const lines = await OrderLine.find({
		guild_id: board.guild_id,
		board_id: String(board._id),
	}).lean();
	return sortLines(lines);
}

module.exports = {
	QTY_DELTAS,
	findBoardById,
	findBoardByChannelAndName,
	findBoardsByChannel,
	createBoard,
	deleteBoard,
	deleteBoardsByOperation,
	closeBoard,
	reopenBoard,
	setSelectedLine,
	applyIncrement,
	fillToTarget,
	cycleLinePriority,
	correctLine,
	deleteLine,
	setDraft,
	getDraft,
	consumeDraft,
	createLine,
	countLines,
	listLines,
	sortLines,
	refreshOrderBoard,
	refreshOrderBoardDebounced,
	bootstrapOrderBoard,
	allocateLineId,
};
