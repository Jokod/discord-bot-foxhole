const Translate = require('../../../utils/translations.js');
const { decode } = require('../../../shared/customId.js');
const {
	findBoardById,
	correctLine,
	refreshOrderBoard,
} = require('../../../services/order/index.js');
const { appendOrderLog } = require('../../../utils/orderBoardLog.js');
const { v2Text } = require('../../../utils/componentsV2.js');

module.exports = {
	id: 'order_correct_modal',

	async execute(interaction) {
		const { client, guild, customId, user, fields } = interaction;
		const translations = new Translate(client, guild.id);
		const parsed = decode(customId);
		const boardId = parsed?.parts?.[0];
		const lineId = parsed?.parts?.[1];
		const current = Number.parseInt(fields.getTextInputValue('order_current'), 10);
		const target = Number.parseInt(fields.getTextInputValue('order_target'), 10);

		if (!boardId || !lineId || !Number.isFinite(current) || current < 0 || !Number.isFinite(target) || target < 1) {
			return interaction.reply(v2Text(translations.translate('ORDER_INVALID_TARGET'), { ephemeral: true }));
		}

		const board = await findBoardById(boardId, guild.id);
		if (!board) {
			return interaction.reply(v2Text(translations.translate('ORDER_BOARD_NOT_EXIST'), { ephemeral: true }));
		}
		if (board.status === 'closed') {
			return interaction.reply(v2Text(translations.translate('ORDER_STATUS_CLOSED'), { ephemeral: true }));
		}

		await interaction.deferReply({ flags: 64 });

		const line = await correctLine(guild.id, board._id, lineId, { current, target });
		if (!line) {
			await interaction.editReply(v2Text(translations.translate('ORDER_LINE_NOT_EXIST'))).catch(() => undefined);
			return;
		}

		await appendOrderLog(client, board, translations.translate('ORDER_LOG_CORRECT', {
			user: `<@${user.id}>`,
			name: line.name || '—',
			current,
			target,
		}));

		await refreshOrderBoard(client, board, interaction.channel);
		await interaction.deleteReply().catch(() => undefined);
	},
};
