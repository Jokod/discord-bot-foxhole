const Translate = require('../../../utils/translations.js');
const { decode } = require('../../../shared/customId.js');
const { createMaterialSelectRows, getCamp } = require('../../../utils/stockCatalog.js');
const { findBoardById } = require('../../../services/order/index.js');

module.exports = {
	id: 'order_sub',

	async execute(interaction) {
		const { client, guild, customId } = interaction;
		const translations = new Translate(client, guild.id);
		const parsed = decode(customId);
		const boardId = parsed?.parts?.[0];
		const compound = parsed?.parts?.[1] || '';
		const [categoryKey, subcategoryKey] = compound.split('__');

		if (!boardId || !categoryKey || !subcategoryKey) {
			return interaction.reply({ content: translations.translate('INTERACTION_ERROR'), flags: 64 });
		}

		const board = await findBoardById(boardId, guild.id);
		if (!board) {
			return interaction.reply({ content: translations.translate('ORDER_BOARD_NOT_EXIST'), flags: 64 });
		}
		if (board.status === 'closed') {
			return interaction.reply({ content: translations.translate('ORDER_STATUS_CLOSED'), flags: 64 });
		}

		const camp = await getCamp(guild.id);
		const payload = await createMaterialSelectRows(boardId, categoryKey, subcategoryKey, camp, translations);
		return interaction.update(payload);
	},
};
