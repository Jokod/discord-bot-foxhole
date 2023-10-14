const { ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
const { Material } = require('../../../data/models.js');
const Translate = require('../../../utils/translations.js');

module.exports = {
	id: 'modal_logistics_material_validate',

	async execute(interaction) {
		const materialId = interaction.customId.split('-')[1];
		const localization = interaction.fields.getTextInputValue('localization');
		const quantityGiven = interaction.fields.getTextInputValue('quantity_given');
		const translations = new Translate(interaction.client, interaction.guild.id);

		if (isNaN(quantityGiven) || quantityGiven < 0) {
			return await interaction.reply({
				content: translations.translate('MATERIAL_QUANTITY_ERROR'),
				ephemeral: true,
			});
		}

		if (!localization) {
			return await interaction.reply({
				content: translations.translate('MATERIAL_LOCALIZATION_ERROR'),
				ephemeral: true,
			});
		}

		const removeButton = new ButtonBuilder()
			.setCustomId(`button_logistics_material_delete-${materialId}`)
			.setLabel(translations.translate('DELETE'))
			.setStyle(ButtonStyle.Danger);

		const actionRow = new ActionRowBuilder().addComponents(removeButton);

		try {
			const material = await Material.findOneAndUpdate(
				{ material_id: `${materialId}` },
				{
					localization,
					quantityGiven,
					status: 'validated',
				}, { new: true });

			if (!material) {
				return await interaction.reply({
					content: translations.translate('MATERIAL_NOT_EXIST'),
					ephemeral: true,
				});
			}

			await interaction.update({
				content: `**${translations.translate('ID')}:** ${materialId}\n**${translations.translate('MATERIAL')}:** ${material.name}\n**${translations.translate('QUANTITY')}:** ${material.quantityAsk}\n**${translations.translate('MATERIAL_PERSON_IN_CHARGE')}:** <@${interaction.user.id}>\n\n**${translations.translate('MATERIAL_LOCALIZATION')}:** ${localization}\n**${translations.translate('MATERIAL_QUANTITY_GIVEN')}:** ${quantityGiven}`,
				components: [actionRow],
			});
		}
		catch (err) {
			console.error(err);
			return await interaction.reply({
				content: translations.translate('MATERIAL_VALIDATE_ERROR'),
				ephemeral: true,
			});
		}
	},
};
