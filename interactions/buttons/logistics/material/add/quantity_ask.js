const { ModalBuilder, ActionRowBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const { Material } = require('../../../../../data/models.js');
const Translate = require('../../../../../utils/translations.js');
const { canManageMaterial } = require('../../../../../utils/material-permissions.js');

module.exports = {
	id: 'button_logistics_add_quantity_ask',

	async execute(interaction) {
		const { client, guild, message } = interaction;
		const translations = new Translate(client, guild.id);

		try {
			const material = await Material.findOne({ guild_id: guild.id, material_id: `${message.id}` });

			if (!material) {
				return await interaction.reply({
					content: translations.translate('MATERIAL_NOT_EXIST'),
					flags: 64,
				});
			}

			if (!canManageMaterial(interaction, material)) {
				return await interaction.reply({
					content: translations.translate('MATERIAL_CANNOT_MANAGE_ERROR'),
					flags: 64,
				});
			}

			const modal = new ModalBuilder()
				.setCustomId('modal_logistics_add_quantity_ask')
				.setTitle(translations.translate('MATERIAL_SELECT_QUANTITY'));

			const quantityAskField = new TextInputBuilder()
				.setCustomId('quantity_ask')
				.setLabel(translations.translate('MATERIAL_SELECT_QUANTITY'))
				.setStyle(TextInputStyle.Short)
				.setValue(`${material.quantityAsk}`)
				.setMinLength(1)
				.setMaxLength(5)
				.setRequired(true);

			const actionRow = new ActionRowBuilder().addComponents(quantityAskField);

			modal.addComponents(actionRow);

			await interaction.showModal(modal);
		}
		catch (error) {
			console.error(error);
			return await interaction.reply({
				content: translations.translate('MATERIAL_SELECT_QUANTITY_ERROR'),
				flags: 64,
			});
		}
	},
};
