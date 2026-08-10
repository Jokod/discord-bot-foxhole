const Translate = require('../../../utils/translations.js');
const { decode } = require('../../../shared/customId.js');
const { createSubcategoryRows } = require('../../../utils/stockCatalog.js');
const { findBoardById } = require('../../../services/order/index.js');

module.exports = {
	id: 'order_cat',

	async execute(interaction) {
		const { client, guild, customId } = interaction;
		const translations = new Translate(client, guild.id);
		const parsed = decode(customId);
		const boardId = parsed?.parts?.[0];
		const categoryKey = parsed?.parts?.[1];

		if (!boardId || !categoryKey) {
			return interaction.reply({ content: translations.translate('INTERACTION_ERROR'), flags: 64 });
		}

		const board = await findBoardById(boardId, guild.id);
		if (!board) {
			return interaction.reply({ content: translations.translate('ORDER_BOARD_NOT_EXIST'), flags: 64 });
		}
		if (board.status === 'closed') {
			return interaction.reply({ content: translations.translate('ORDER_STATUS_CLOSED'), flags: 64 });
		}

		return interaction.update({
			content: translations.translate('MATERIAL_SELECT_SUBCATEGORY'),
			components: createSubcategoryRows(boardId, categoryKey, translations),
		});
	},
};
