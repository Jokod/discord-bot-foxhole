const Translate = require('../../../utils/translations.js');
const { decode } = require('../../../shared/customId.js');
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
			return interaction.reply({ content: translations.translate('INTERACTION_ERROR'), flags: 64 });
		}

		const board = await findBoardById(boardId, guild.id);
		if (!board) {
			return interaction.reply({ content: translations.translate('ORDER_BOARD_NOT_EXIST'), flags: 64 });
		}
		if (board.status === 'closed') {
			return interaction.reply({ content: translations.translate('ORDER_STATUS_CLOSED'), flags: 64 });
		}

		await setSelectedLine(board, lineId);
		await interaction.deferUpdate();
		await refreshOrderBoard(client, board, interaction.channel);
	},
};
