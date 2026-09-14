const Translate = require('../../../utils/translations.js');
const { decode } = require('../../../shared/customId.js');
const {
	findBoardById,
	deleteLine,
	refreshOrderBoard,
} = require('../../../services/order/index.js');
const { OrderLine } = require('../../../data/models.js');
const { canManageLine } = require('../../../utils/order-permissions.js');
const { appendOrderLog } = require('../../../utils/orderBoardLog.js');
const { v2Text } = require('../../../utils/componentsV2.js');

module.exports = {
	id: 'order_delete_line',

	async execute(interaction) {
		const { client, guild, customId, user } = interaction;
		const translations = new Translate(client, guild.id);
		const parsed = decode(customId);
		const boardId = parsed?.parts?.[0];
		const explicitLineId = parsed?.parts?.[1];

		if (!boardId) {
			return interaction.reply(v2Text(translations.translate('INTERACTION_ERROR'), { ephemeral: true }));
		}

		const board = await findBoardById(boardId, guild.id);
		if (!board) {
			return interaction.reply(v2Text(translations.translate('ORDER_BOARD_NOT_EXIST'), { ephemeral: true }));
		}
		if (board.status === 'closed') {
			return interaction.reply(v2Text(translations.translate('ORDER_STATUS_CLOSED'), { ephemeral: true }));
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
			return interaction.reply(v2Text(translations.translate('ORDER_NO_SELECTION'), { ephemeral: true }));
		}

		if (!canManageLine(interaction, line, board)) {
			return interaction.reply(v2Text(translations.translate('ORDER_CANNOT_MANAGE_ERROR'), { ephemeral: true }));
		}

		await interaction.deferUpdate();

		const result = await deleteLine(guild.id, board._id, line.line_id);
		if (!result?.deletedCount) {
			return interaction.followUp(v2Text(translations.translate('ORDER_LINE_NOT_EXIST'), { ephemeral: true })).catch(() => undefined);
		}

		await appendOrderLog(client, board, translations.translate('ORDER_LOG_DELETE_LINE', {
			user: `<@${user.id}>`,
			name: line.name || '—',
		}));
		await refreshOrderBoard(client, board, interaction.channel);
	},
};
