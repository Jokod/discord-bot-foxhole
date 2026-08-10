const {
	ModalBuilder,
	TextInputBuilder,
	TextInputStyle,
	ActionRowBuilder,
} = require('discord.js');
const Translate = require('../../../utils/translations.js');
const { decode, encode } = require('../../../shared/customId.js');
const { findBoardById } = require('../../../services/order/index.js');
const { OrderLine } = require('../../../data/models.js');

module.exports = {
	id: 'order_correct',

	async execute(interaction) {
		const { client, guild, customId } = interaction;
		const translations = new Translate(client, guild.id);
		const parsed = decode(customId);
		const boardId = parsed?.parts?.[0];
		const explicitLineId = parsed?.parts?.[1];

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
			return interaction.reply({ content: translations.translate('ORDER_NO_SELECTION'), flags: 64 });
		}

		const modal = new ModalBuilder()
			.setCustomId(encode('order_correct_modal', boardId, line.line_id))
			.setTitle(translations.translate('ORDER_CORRECT_TITLE').slice(0, 45));

		const currentInput = new TextInputBuilder()
			.setCustomId('order_current')
			.setLabel(translations.translate('ORDER_CURRENT').slice(0, 45))
			.setStyle(TextInputStyle.Short)
			.setRequired(true)
			.setValue(String(Number(line.current) || 0))
			.setMinLength(1)
			.setMaxLength(6);

		const targetInput = new TextInputBuilder()
			.setCustomId('order_target')
			.setLabel(translations.translate('ORDER_TARGET').slice(0, 45))
			.setStyle(TextInputStyle.Short)
			.setRequired(true)
			.setValue(String(Math.max(1, Number(line.target) || 1)))
			.setMinLength(1)
			.setMaxLength(6);

		modal.addComponents(
			new ActionRowBuilder().addComponents(currentInput),
			new ActionRowBuilder().addComponents(targetInput),
		);
		return interaction.showModal(modal);
	},
};
