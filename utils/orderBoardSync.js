const { OrderBoard, OrderLine, TrackedMessage, Operation } = require('../data/models.js');
const Translate = require('./translations.js');
const {
	saveTrackedMessage,
	findTrackedMessage,
} = require('./trackedMessage.js');
const {
	MESSAGE_TYPE_BOARD,
	buildOrderMessagePayload,
} = require('../interactions/embeds/orderBoard.js');
const { getPrioritySortRank } = require('./material-priority.js');
const { createLogThread } = require('./orderBoardLog.js');
const {
	sendV2,
	editOrRepostV2,
} = require('./componentsV2.js');
const { withAsyncLock, trackedLockKey } = require('./asyncLock.js');

const refreshTimers = new Map();
const REFRESH_DEBOUNCE_MS = 300;

function guildLabel(client, guildId) {
	return client?.guilds?.cache?.get(guildId)?.name ?? guildId;
}

function sortLines(lines) {
	return [...(lines || [])].sort((a, b) => {
		const rank = getPrioritySortRank(a.priority) - getPrioritySortRank(b.priority);
		if (rank !== 0) return rank;
		return Number(a.line_id) - Number(b.line_id);
	});
}

/**
 * @param {string} guildId
 * @param {string} boardMongoId
 * @returns {Promise<string>}
 */
async function allocateLineId(guildId, boardMongoId) {
	const updated = await OrderBoard.findOneAndUpdate(
		{ _id: boardMongoId, guild_id: guildId },
		{ $inc: { next_line_number: 1 } },
		{ returnDocument: 'after' },
	);
	if (!updated) throw new Error('Order board not found for line id allocation');
	return String(updated.next_line_number);
}

/**
 * @param {import('discord.js').Client} client
 * @param {object} board
 */
async function buildOrderPayload(client, board) {
	const translations = new Translate(client, board.guild_id);
	const rawLines = await OrderLine.find({
		guild_id: board.guild_id,
		board_id: String(board._id),
	}).lean();
	const lines = sortLines(rawLines);

	let operationTitle = null;
	if (board.operation_id) {
		const op = await Operation.findOne({
			guild_id: board.guild_id,
			operation_id: board.operation_id,
		}).lean();
		operationTitle = op?.title || board.operation_id;
	}

	const selectedStillExists = board.selected_line_id
		&& lines.some((l) => String(l.line_id) === String(board.selected_line_id));
	if (lines.length && !selectedStillExists) {
		board.selected_line_id = String(lines[0].line_id);
		await OrderBoard.updateOne({ _id: board._id }, { selected_line_id: board.selected_line_id });
	}
	else if (!lines.length && board.selected_line_id) {
		board.selected_line_id = null;
		await OrderBoard.updateOne({ _id: board._id }, { selected_line_id: null });
	}

	const payload = buildOrderMessagePayload(board, lines, translations, operationTitle);
	return { payload, lines, translations };
}

/**
 * @param {import('discord.js').TextChannel} channel
 * @param {import('discord.js').Client} client
 * @param {object} board
 */
async function bootstrapOrderBoard(channel, client, board) {
	const { payload, translations } = await buildOrderPayload(client, board);
	const msg = await sendV2(channel, payload);
	await saveTrackedMessage(
		board.guild_id,
		channel.id,
		msg.id,
		`${MESSAGE_TYPE_BOARD}:${board._id}`,
		TrackedMessage,
	);
	try {
		await createLogThread(channel, board, translations);
	}
	catch (err) {
		console.error(`[OrderBoard] log thread failed for serveur ${guildLabel(client, board.guild_id)} (board ${board._id}):`, err.message);
	}
	return msg;
}

/**
 * @param {import('discord.js').Client} client
 * @param {object} board
 * @param {import('discord.js').TextChannel} [channel]
 */
async function refreshOrderBoard(client, board, channel) {
	if (!board?._id || !board?.guild_id) return false;

	const fresh = await OrderBoard.findById(board._id);
	if (!fresh) return false;

	let textChannel = channel;
	if (!textChannel) {
		textChannel = await client.channels.fetch(fresh.channel_id).catch(() => null);
	}
	if (!textChannel?.isTextBased?.()) return false;

	const messageType = `${MESSAGE_TYPE_BOARD}:${fresh._id}`;

	return withAsyncLock(trackedLockKey(fresh.guild_id, messageType), async () => {
		const { payload, translations } = await buildOrderPayload(client, fresh);

		const existing = await findTrackedMessage(textChannel, fresh.guild_id, messageType, {
			model: TrackedMessage,
		});

		let usedFallback = false;
		if (existing) {
			const { message, reposted } = await editOrRepostV2(existing, textChannel, payload);
			if (reposted) {
				usedFallback = true;
				await saveTrackedMessage(
					fresh.guild_id,
					textChannel.id,
					message.id,
					messageType,
					TrackedMessage,
				);
			}
		}
		else {
			usedFallback = true;
			const sent = await sendV2(textChannel, payload);
			await saveTrackedMessage(
				fresh.guild_id,
				textChannel.id,
				sent.id,
				messageType,
				TrackedMessage,
			);
		}

		if (usedFallback && !fresh.log_thread_id) {
			await createLogThread(textChannel, fresh, translations).catch(() => undefined);
		}

		return true;
	});
}

async function deleteOrderTrackedMessages(guildId, boardMongoId, channel = null, client = null) {
	const messageTypes = [`${MESSAGE_TYPE_BOARD}:${boardMongoId}`];
	const tracked = await TrackedMessage.find({
		server_id: guildId,
		message_type: { $in: messageTypes },
	}).lean();

	const resolvedClient = client ?? channel?.client ?? null;

	if (tracked.length > 0 && (channel?.isTextBased?.() || resolvedClient)) {
		await Promise.all(tracked.map(async (doc) => {
			if (!doc.message_id) return;
			try {
				let textChannel = channel;
				if (doc.channel_id && (!textChannel || textChannel.id !== doc.channel_id) && resolvedClient) {
					textChannel = await resolvedClient.channels.fetch(doc.channel_id).catch(() => null);
				}
				if (!textChannel?.isTextBased?.()) return;
				const msg = await textChannel.messages.fetch(doc.message_id);
				await msg.delete();
			}
			catch {
				// already gone
			}
		}));
	}

	await TrackedMessage.deleteMany({
		server_id: guildId,
		message_type: { $in: messageTypes },
	});
}

function refreshOrderBoardDebounced(client, board, channel) {
	const key = String(board._id);
	const existing = refreshTimers.get(key);
	if (existing) {
		clearTimeout(existing.timer);
		existing.resolve(false);
	}

	return new Promise((resolve) => {
		const timer = setTimeout(async () => {
			refreshTimers.delete(key);
			try {
				resolve(await refreshOrderBoard(client, board, channel));
			}
			catch (err) {
				resolve(false);
				console.error(`[OrderBoard] debounced refresh failed for serveur ${guildLabel(client, board.guild_id)} (board ${key}):`, err.message);
			}
		}, REFRESH_DEBOUNCE_MS);
		refreshTimers.set(key, { timer, resolve });
	});
}

/**
 * @param {import('discord.js').Client} client
 */
async function syncAllOrderBoards(client) {
	const boards = await OrderBoard.find({ status: { $in: ['open', 'closed'] } }).lean();
	let ok = 0;
	let fail = 0;
	for (const board of boards) {
		try {
			const success = await refreshOrderBoard(client, board);
			if (success) ok += 1;
			else fail += 1;
		}
		catch (err) {
			fail += 1;
			console.error(`[OrderBoard] refresh failed for serveur ${guildLabel(client, board.guild_id)} (board ${board._id}):`, err.message);
		}
	}
	console.log(`[OrderBoard] syncAllOrderBoards done: ok=${ok} fail=${fail} total=${boards.length}`);
	return { ok, fail, total: boards.length };
}

module.exports = {
	allocateLineId,
	buildOrderPayload,
	bootstrapOrderBoard,
	refreshOrderBoard,
	refreshOrderBoardDebounced,
	deleteOrderTrackedMessages,
	syncAllOrderBoards,
};
