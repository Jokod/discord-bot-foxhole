const Translate = require('../../../utils/translations.js');
const { decode } = require('../../../shared/customId.js');
const {
	findBoardById,
	getDraft,
	consumeDraft,
	createLine,
	deleteLine,
	refreshOrderBoard,
} = require('../../../services/order/index.js');
const { appendOrderLog } = require('../../../utils/orderBoardLog.js');
const { MAX_ORDER_LINES } = require('../../../utils/order-limits.js');
const { v2Text, isDisplayUpdateFailedError } = require('../../../utils/componentsV2.js');

module.exports = {
	id: 'order_add_modal',

	async execute(interaction) {
		const { client, guild, customId, user, fields } = interaction;
		const translations = new Translate(client, guild.id);
		const boardId = decode(customId)?.parts?.[0];
		const rawTarget = fields.getTextInputValue('order_target');
		const target = Number.parseInt(rawTarget, 10);

		if (!boardId || !Number.isFinite(target) || target < 1) {
			return interaction.reply(v2Text(translations.translate('ORDER_INVALID_TARGET'), { ephemeral: true }));
		}

		const board = await findBoardById(boardId, guild.id);
		if (!board) {
			return interaction.reply(v2Text(translations.translate('ORDER_BOARD_NOT_EXIST'), { ephemeral: true }));
		}
		if (board.status === 'closed') {
			return interaction.reply(v2Text(translations.translate('ORDER_STATUS_CLOSED'), { ephemeral: true }));
		}

		const draft = getDraft(board, user.id);
		if (!draft?.name) {
			return interaction.reply(v2Text(translations.translate('INTERACTION_ERROR'), { ephemeral: true }));
		}

		await interaction.deferReply({ flags: 64 });

		let line;
		try {
			line = await createLine(board, {
				name: draft.name,
				category: draft.category,
				target,
				ownerId: user.id,
			});
			await consumeDraft(board, user.id);
		}
		catch (err) {
			if (err?.code === 'ORDER_FULL') {
				await interaction.editReply(v2Text(
					translations.translate('ORDER_FULL', { max: MAX_ORDER_LINES }),
				)).catch(() => undefined);
				return;
			}
			throw err;
		}

		await appendOrderLog(client, board, translations.translate('ORDER_LOG_ADD', {
			user: `<@${user.id}>`,
			name: draft.name,
			target,
		}));

		try {
			await refreshOrderBoard(client, board, interaction.channel);
			await interaction.deleteReply().catch(() => undefined);
		}
		catch (err) {
			if (isDisplayUpdateFailedError(err) && line) {
				await deleteLine(guild.id, board._id, line.line_id).catch(() => undefined);
				await interaction.editReply(v2Text(
					translations.translate('DISPLAY_UPDATE_FAILED'),
				)).catch(() => undefined);
				return;
			}
			throw err;
		}
	},
};
