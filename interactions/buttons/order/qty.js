const Translate = require('../../../utils/translations.js');
const { decode } = require('../../../shared/customId.js');
const {
	QTY_DELTAS,
	applyIncrement,
	fillToTarget,
	findBoardById,
	refreshOrderBoardDebounced,
} = require('../../../services/order/index.js');
const { OrderLine } = require('../../../data/models.js');
const { appendOrderLog } = require('../../../utils/orderBoardLog.js');

module.exports = {
	id: 'order_qty',

	async execute(interaction) {
		const { client, guild, customId, user } = interaction;
		const translations = new Translate(client, guild.id);
		const parsed = decode(customId);
		const action = parsed?.parts?.[0];
		const boardId = parsed?.parts?.[1];
		const explicitLineId = parsed?.parts?.[2];
		const isMax = action === 'max';
		const delta = QTY_DELTAS[action];

		if ((!isMax && delta == null) || !boardId) {
			return interaction.reply({ content: translations.translate('INTERACTION_ERROR'), flags: 64 });
		}

		const board = await findBoardById(boardId, guild.id);
		if (!board) {
			return interaction.reply({ content: translations.translate('ORDER_BOARD_NOT_EXIST'), flags: 64 });
		}
		if (board.status === 'closed') {
			return interaction.reply({ content: translations.translate('ORDER_STATUS_CLOSED'), flags: 64 });
		}

		let lineId = explicitLineId && explicitLineId !== '0'
			? explicitLineId
			: board.selected_line_id;
		if (!lineId) {
			const fallback = await OrderLine.findOne({
				guild_id: guild.id,
				board_id: String(board._id),
			}).sort({ line_id: 1 }).lean();
			lineId = fallback?.line_id;
		}
		if (!lineId) {
			return interaction.reply({ content: translations.translate('ORDER_NO_SELECTION'), flags: 64 });
		}

		await interaction.deferUpdate();

		const result = isMax
			? await fillToTarget(guild.id, board._id, lineId)
			: await applyIncrement(guild.id, board._id, lineId, delta);
		if (!result?.line) {
			return interaction.followUp({
				content: translations.translate('ORDER_LINE_NOT_EXIST'),
				flags: 64,
			}).catch(() => undefined);
		}

		const { line, previous, current } = result;
		const itemName = line.name || '—';
		if (isMax) {
			await appendOrderLog(client, board, translations.translate('ORDER_LOG_MAX', {
				user: `<@${user.id}>`,
				name: itemName,
				from: previous,
				to: current,
			}));
		}
		else if (previous !== current) {
			const signed = delta > 0 ? `+${delta}` : String(delta);
			await appendOrderLog(client, board, translations.translate('ORDER_LOG_QTY', {
				user: `<@${user.id}>`,
				name: itemName,
				from: previous,
				to: current,
				delta: signed,
			}));
		}

		await refreshOrderBoardDebounced(client, board, interaction.channel);
	},
};
