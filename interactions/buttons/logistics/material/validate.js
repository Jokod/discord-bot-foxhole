const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');
const { Material } = require('../../../../data/models.js');
const Translate = require('../../../../utils/translations.js');

module.exports = {
	id: 'button_logistics_material_validate',

	async execute(interaction) {
		const { client, guild, message } = interaction;
		const translations = new Translate(client, guild.id);

		try {
			const material = await Material.findOne({ guild_id: guild.id, material_id: `${message.id}` });

			if (!material) {
				return await interaction.reply({
					content: translations.translate('MATERIAL_NOT_EXIST'),
					ephemeral: true,
				});
			}

			if (interaction.user.id !== material.person_id) {
				return await interaction.reply({
					content: translations.translate('MATERIAL_ARE_NO_OWNER_ERROR'),
					ephemeral: true,
				});
			}

			const localization = material.localization ?? ' ';

			const modal = new ModalBuilder()
				.setCustomId('modal_logistics_material_validate')
				.setTitle(translations.translate('MATERIAL_CONFIRMATION'));

			const locationInput = new TextInputBuilder()
				.setCustomId('localization')
				.setLabel(translations.translate('MATERIAL_LOCALIZATION'))
				.setPlaceholder(translations.translate('MATERIAL_LOCALIZATION'))
				.setValue(`${localization}`)
				.setStyle(TextInputStyle.Short)
				.setMaxLength(100)
				.setRequired(true);

			const quantityGiven = new TextInputBuilder()
				.setCustomId('quantity_given')
				.setLabel(translations.translate('MATERIAL_QUANTITY_GIVEN'))
				.setPlaceholder(translations.translate('MATERIAL_QUANTITY_GIVEN') + ` (${material.quantityGiven}/${material.quantityAsk})`)
				.setValue('0')
				.setStyle(TextInputStyle.Short)
				.setMinLength(1)
				.setMaxLength(5)
				.setRequired(true);

			const locationRow = new ActionRowBuilder().addComponents(locationInput);
			const quantityRow = new ActionRowBuilder().addComponents(quantityGiven);

			modal.addComponents(locationRow, quantityRow);

			await interaction.showModal(modal);
		}
		catch (error) {
			console.error(error);
			return await interaction.reply({
				content: translations.translate('MATERIAL_VALIDATE_ERROR'),
				ephemeral: true,
			});
		}
	},
};
