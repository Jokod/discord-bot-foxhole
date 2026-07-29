const Translate = require('../../../utils/translations.js');
const { decode } = require('../../../shared/customId.js');
const {
	cycleLinePriority,
	findBoardById,
	refreshOrderBoardDebounced,
} = require('../../../services/order/index.js');
const { OrderLine } = require('../../../data/models.js');
const { appendOrderLog } = require('../../../utils/orderBoardLog.js');
const {
	getPriorityTranslationKey,
	getPriorityColoredText,
} = require('../../../utils/material-priority.js');

module.exports = {
	id: 'order_priority',

	async execute(interaction) {
		const { client, guild, customId, user } = interaction;
		const translations = new Translate(client, guild.id);
		const parsed = decode(customId);
		const boardId = parsed?.parts?.[0];
		const explicitLineId = parsed?.parts?.[1];

		if (!boardId) {
			return interaction.reply({ content: translations.translate('INTERACTION_ERROR'), flags: 64 });
		}

		const board = await findBoardById(boardId, guild.id);
		if (!board) {
			return interaction.reply({ content: translations.translate('ORDER_BOARD_NOT_EXIST'), flags: 64 });
		}
		if (board.status === 'closed') {
			return interaction.reply({ content: translations.translate('ORDER_STATUS_CLOSED'), flags: 64 });
		}

		const lineId = explicitLineId && explicitLineId !== '0'
			? explicitLineId
			: board.selected_line_id;
		const line = lineId
			? await OrderLine.findOne({
				guild_id: guild.id,
				board_id: String(board._id),
				line_id: String(lineId),
			}).lean()
			: null;
		if (!line) {
			return interaction.reply({ content: translations.translate('ORDER_NO_SELECTION'), flags: 64 });
		}

		await interaction.deferUpdate();

		const result = await cycleLinePriority(guild.id, board._id, line.line_id);
		if (!result?.line) {
			return interaction.followUp({
				content: translations.translate('ORDER_LINE_NOT_EXIST'),
				flags: 64,
			}).catch(() => undefined);
		}

		const prioLabel = getPriorityColoredText(
			result.priority,
			translations.translate(getPriorityTranslationKey(result.priority)),
		);
		await appendOrderLog(client, board, translations.translate('ORDER_LOG_PRIORITY', {
			user: `<@${user.id}>`,
			name: result.line.name || '—',
			priority: prioLabel,
		}));

		await refreshOrderBoardDebounced(client, board, interaction.channel);
	},
};
