const Translate = require('../../../utils/translations.js');
const { decode } = require('../../../shared/customId.js');
const { createCategoryRows } = require('../../../utils/stockCatalog.js');
const { findBoardById } = require('../../../services/order/index.js');

module.exports = {
	id: 'order_back',

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

		return interaction.update({
			content: translations.translate('MATERIAL_SELECT_CATEGORY'),
			components: createCategoryRows(translations, boardId),
		});
	},
};
