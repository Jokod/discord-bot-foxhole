const {
	ModalBuilder,
	TextInputBuilder,
	TextInputStyle,
	ActionRowBuilder,
} = require('discord.js');
const Translate = require('../../../utils/translations.js');
const { decode, encode } = require('../../../shared/customId.js');
const { findBoardById, setDraft } = require('../../../services/order/index.js');

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
			return interaction.reply({ content: translations.translate('INTERACTION_ERROR'), flags: 64 });
		}

		const board = await findBoardById(boardId, guild.id);
		if (!board) {
			return interaction.reply({ content: translations.translate('ORDER_BOARD_NOT_EXIST'), flags: 64 });
		}
		if (board.status === 'closed') {
			return interaction.reply({ content: translations.translate('ORDER_STATUS_CLOSED'), flags: 64 });
		}

		await setDraft(board, user.id, { name: itemName, category: categoryKey });

		const modal = new ModalBuilder()
			.setCustomId(encode('order_add_modal', boardId))
			.setTitle(translations.translate('ORDER_ADD_TARGET_TITLE').slice(0, 45));

		const targetInput = new TextInputBuilder()
			.setCustomId('order_target')
			.setLabel(translations.translate('ORDER_TARGET').slice(0, 45))
			.setStyle(TextInputStyle.Short)
			.setRequired(true)
			.setMinLength(1)
			.setMaxLength(6);

		modal.addComponents(new ActionRowBuilder().addComponents(targetInput));
		return interaction.showModal(modal);
	},
};
