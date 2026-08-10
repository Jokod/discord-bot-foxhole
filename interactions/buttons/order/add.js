const Translate = require('../../../utils/translations.js');
const { decode } = require('../../../shared/customId.js');
const { createCategoryRows } = require('../../../utils/stockCatalog.js');
const { findBoardById, countLines } = require('../../../services/order/index.js');
const { MAX_ORDER_LINES } = require('../../../utils/order-limits.js');

module.exports = {
	id: 'order_add',

	async execute(interaction) {
		const { client, guild, customId } = interaction;
		const translations = new Translate(client, guild.id);
		const boardId = decode(customId)?.parts?.[0];
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

		const lineCount = await countLines(board);
		if (lineCount >= MAX_ORDER_LINES) {
			return interaction.reply({
				content: translations.translate('ORDER_FULL', { max: MAX_ORDER_LINES }),
				flags: 64,
			});
		}

		return interaction.reply({
			content: translations.translate('MATERIAL_SELECT_CATEGORY'),
			components: createCategoryRows(translations, boardId),
			flags: 64,
		});
	},
};
