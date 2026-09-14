const Translate = require('../../../utils/translations.js');
const { decode } = require('../../../shared/customId.js');
const { createCategoryRows } = require('../../../utils/stockCatalog.js');
const { findBoardById } = require('../../../services/order/index.js');
const { v2Text, buildV2Payload, joinBlocks } = require('../../../utils/componentsV2.js');

module.exports = {
	id: 'order_back',

	async execute(interaction) {
		const { client, guild, customId } = interaction;
		const translations = new Translate(client, guild.id);
		const boardId = decode(customId)?.parts?.[0];

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

		return interaction.update(buildV2Payload({
			children: joinBlocks([
				`### ${translations.translate('MATERIAL_SELECT_CATEGORY')}`,
			]),
			actionRows: createCategoryRows(translations, boardId),
		}));
	},
};
