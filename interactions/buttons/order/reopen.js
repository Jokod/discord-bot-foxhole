const Translate = require('../../../utils/translations.js');
const { decode } = require('../../../shared/customId.js');
const { canManageBoard } = require('../../../utils/order-permissions.js');
const { findBoardById, reopenBoard, refreshOrderBoard } = require('../../../services/order/index.js');
const { appendOrderLog } = require('../../../utils/orderBoardLog.js');
const { v2Text } = require('../../../utils/componentsV2.js');

module.exports = {
	id: 'order_reopen',

	async execute(interaction) {
		const { client, guild, customId, user } = interaction;
		const translations = new Translate(client, guild.id);
		const boardId = decode(customId)?.parts?.[0];

		if (!boardId) {
			return interaction.reply(v2Text(translations.translate('INTERACTION_ERROR'), { ephemeral: true }));
		}

		const board = await findBoardById(boardId, guild.id);
		if (!board) {
			return interaction.reply(v2Text(translations.translate('ORDER_BOARD_NOT_EXIST'), { ephemeral: true }));
		}

		if (!canManageBoard(interaction, board)) {
			return interaction.reply(v2Text(translations.translate('ORDER_CANNOT_MANAGE_ERROR'), { ephemeral: true }));
		}

		if (board.status !== 'closed') {
			return interaction.reply(v2Text(translations.translate('ORDER_STATUS_ALREADY_OPEN'), { ephemeral: true }));
		}

		await interaction.deferUpdate();
		await reopenBoard(board);
		await appendOrderLog(client, board, translations.translate('ORDER_LOG_REOPEN', {
			user: `<@${user.id}>`,
		}));
		await refreshOrderBoard(client, board, interaction.channel);
	},
};
