const Translate = require('../../../utils/translations.js');
const { decode } = require('../../../shared/customId.js');
const {
	findBoardById,
	getDraft,
	consumeDraft,
	createLine,
	countLines,
	refreshOrderBoard,
} = require('../../../services/order/index.js');
const { appendOrderLog } = require('../../../utils/orderBoardLog.js');
const { MAX_ORDER_LINES } = require('../../../utils/order-limits.js');

module.exports = {
	id: 'order_add_modal',

	async execute(interaction) {
		const { client, guild, customId, user, fields } = interaction;
		const translations = new Translate(client, guild.id);
		const boardId = decode(customId)?.parts?.[0];
		const rawTarget = fields.getTextInputValue('order_target');
		const target = Number.parseInt(rawTarget, 10);

		if (!boardId || !Number.isFinite(target) || target < 1) {
			return interaction.reply({
				content: translations.translate('ORDER_INVALID_TARGET'),
				flags: 64,
			});
		}

		const board = await findBoardById(boardId, guild.id);
		if (!board) {
			return interaction.reply({ content: translations.translate('ORDER_BOARD_NOT_EXIST'), flags: 64 });
		}
		if (board.status === 'closed') {
			return interaction.reply({ content: translations.translate('ORDER_STATUS_CLOSED'), flags: 64 });
		}

		const lineCount = await countLines(board);
		if (lineCount >= MAX_ORDER_LINES) {
			return interaction.reply({
				content: translations.translate('ORDER_FULL', { max: MAX_ORDER_LINES }),
				flags: 64,
			});
		}

		const draft = getDraft(board, user.id);
		if (!draft?.name) {
			return interaction.reply({
				content: translations.translate('INTERACTION_ERROR'),
				flags: 64,
			});
		}

		await interaction.deferReply({ flags: 64 });

		try {
			await createLine(board, {
				name: draft.name,
				category: draft.category,
				target,
				ownerId: user.id,
			});
			await consumeDraft(board, user.id);
		}
		catch (err) {
			if (err?.code === 'ORDER_FULL') {
				await interaction.editReply({
					content: translations.translate('ORDER_FULL', { max: MAX_ORDER_LINES }),
				}).catch(() => undefined);
				return;
			}
			throw err;
		}

		await appendOrderLog(client, board, translations.translate('ORDER_LOG_ADD', {
			user: `<@${user.id}>`,
			name: draft.name,
			target,
		}));
		await refreshOrderBoard(client, board, interaction.channel);
		await interaction.deleteReply().catch(() => undefined);
	},
};
