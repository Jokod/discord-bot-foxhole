const Translate = require('../../../utils/translations.js');
const { decode } = require('../../../shared/customId.js');
const { v2Text } = require('../../../utils/componentsV2.js');
const {
	findBoardById,
	setSelectedLine,
	refreshOrderBoard,
} = require('../../../services/order/index.js');

module.exports = {
	id: 'order_select',

	async execute(interaction) {
		const { client, guild, customId, values } = interaction;
		const translations = new Translate(client, guild.id);
		const boardId = decode(customId)?.parts?.[0];
		const lineId = values?.[0];

		if (!boardId || !lineId) {
			return interaction.reply(v2Text(translations.translate('INTERACTION_ERROR'), { ephemeral: true }));
		}

		const board = await findBoardById(boardId, guild.id);
		if (!board) {
			return interaction.reply(v2Text(translations.translate('ORDER_BOARD_NOT_EXIST'), { ephemeral: true }));
		}
		if (board.status === 'closed') {
			return interaction.reply(v2Text(translations.translate('ORDER_STATUS_CLOSED'), { ephemeral: true }));
		}

		await setSelectedLine(board, lineId);
		await interaction.deferUpdate();
		await refreshOrderBoard(client, board, interaction.channel);
	},
};
