const Translate = require('../../../utils/translations.js');
const { decode, encode } = require('../../../shared/customId.js');
const { findBoardById } = require('../../../services/order/index.js');
const { OrderLine } = require('../../../data/models.js');
const { v2Text } = require('../../../utils/componentsV2.js');
const { buildLabeledModal, TextInputStyle } = require('../../../utils/modalLabels.js');

module.exports = {
	id: 'order_correct',

	async execute(interaction) {
		const { client, guild, customId } = interaction;
		const translations = new Translate(client, guild.id);
		const parsed = decode(customId);
		const boardId = parsed?.parts?.[0];
		const explicitLineId = parsed?.parts?.[1];

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

		const lineId = explicitLineId && explicitLineId !== '0'
			? explicitLineId
			: board.selected_line_id;
		const line = lineId
			? await OrderLine.findOne({
				guild_id: guild.id,
				board_id: String(board._id),
				line_id: String(lineId),
			}).lean()
			: null;
		if (!line) {
			return interaction.reply(v2Text(translations.translate('ORDER_NO_SELECTION'), { ephemeral: true }));
		}

		const modal = buildLabeledModal({
			customId: encode('order_correct_modal', boardId, line.line_id),
			title: translations.translate('ORDER_CORRECT_TITLE'),
			fields: [
				{
					customId: 'order_current',
					label: translations.translate('ORDER_CURRENT'),
					style: TextInputStyle.Short,
					required: true,
					value: String(Number(line.current) || 0),
					minLength: 1,
					maxLength: 6,
				},
				{
					customId: 'order_target',
					label: translations.translate('ORDER_TARGET'),
					style: TextInputStyle.Short,
					required: true,
					value: String(Math.max(1, Number(line.target) || 1)),
					minLength: 1,
					maxLength: 6,
				},
			],
		});
		return interaction.showModal(modal);
	},
};
