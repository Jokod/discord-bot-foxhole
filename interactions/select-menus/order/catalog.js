const Translate = require('../../../utils/translations.js');
const { decode, encode } = require('../../../shared/customId.js');
const { findBoardById, setDraft } = require('../../../services/order/index.js');
const { v2Text } = require('../../../utils/componentsV2.js');
const { buildLabeledModal, TextInputStyle } = require('../../../utils/modalLabels.js');

module.exports = {
	id: 'order_catalog',

	async execute(interaction) {
		const { client, guild, customId, user, values } = interaction;
		const translations = new Translate(client, guild.id);
		const parsed = decode(customId);
		const boardId = parsed?.parts?.[0];
		const categoryKey = parsed?.parts?.[1];
		const itemName = values?.[0];

		if (!boardId || !categoryKey || !itemName) {
			return interaction.reply(v2Text(translations.translate('INTERACTION_ERROR'), { ephemeral: true }));
		}

		const board = await findBoardById(boardId, guild.id);
		if (!board) {
			return interaction.reply(v2Text(translations.translate('ORDER_BOARD_NOT_EXIST'), { ephemeral: true }));
		}
		if (board.status === 'closed') {
			return interaction.reply(v2Text(translations.translate('ORDER_STATUS_CLOSED'), { ephemeral: true }));
		}

		await setDraft(board, user.id, {
			name: String(itemName).slice(0, 100),
			category: categoryKey,
		});

		const modal = buildLabeledModal({
			customId: encode('order_add_modal', boardId),
			title: translations.translate('ORDER_ADD_TARGET_TITLE'),
			fields: [
				{
					customId: 'order_target',
					label: translations.translate('ORDER_TARGET'),
					style: TextInputStyle.Short,
					required: true,
					minLength: 1,
					maxLength: 6,
				},
			],
		});
		return interaction.showModal(modal);
	},
};
