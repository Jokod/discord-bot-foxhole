const { ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
const { Material } = require('../../../data/models.js');
const Translate = require('../../../utils/translations.js');

module.exports = {
	id: 'modal_logistics_material_validate',

	async execute(interaction) {
		const translations = new Translate(interaction.client, interaction.guild.id);

		const operationId = interaction.customId.split('-')[1];
		const threadId = interaction.customId.split('-')[2];
		const materialId = interaction.customId.split('-')[3];

		const localization = interaction.fields.getTextInputValue('localization');
		const quantityGiven = interaction.fields.getTextInputValue('quantity_given');

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

		const revokeButton = new ButtonBuilder()
			.setCustomId(`button_logistics_revoke-${operationId}-${threadId}-${materialId}`)
			.setLabel(translations.translate('REVOKE'))
			.setStyle(ButtonStyle.Danger);

		const validateButton = new ButtonBuilder()
			.setCustomId(`button_logistics_material_validate-${operationId}-${threadId}-${materialId}`)
			.setLabel(translations.translate('VALIDATE'))
			.setStyle(ButtonStyle.Success);

		const removeButton = new ButtonBuilder()
			.setCustomId(`button_logistics_material_delete-${materialId}`)
			.setLabel(translations.translate('DELETE'))
			.setStyle(ButtonStyle.Danger);

		const actionRow = new ActionRowBuilder().addComponents(revokeButton, validateButton, removeButton);

		try {
			let material = await Material.findOne({ material_id: `${materialId}` });
			let status = 'pending';

			const quantityTotalGiven = parseInt(material.quantityGiven) + parseInt(quantityGiven);

			if (quantityTotalGiven >= material.quantityAsk) {
				status = 'validated';
			}

			material = await Material.findOneAndUpdate(
				{ material_id: `${materialId}` },
				{
					localization,
					quantityGiven: quantityTotalGiven,
					status,
				}, { new: true });

			if (!material) {
				return await interaction.reply({
					content: translations.translate('MATERIAL_NOT_EXIST'),
					ephemeral: true,
				});
			}

			if (material.quantityGiven >= material.quantityAsk) {
				return await interaction.update({
					content: `**${translations.translate('ID')}:** ${materialId}\n**${translations.translate('MATERIAL_CREATOR')}:** <@${material.owner_id}>\n**${translations.translate('MATERIAL')}:** ${material.name}\n**${translations.translate('QUANTITY')}:** ${material.quantityAsk}\n**${translations.translate('MATERIAL_PERSON_IN_CHARGE')}:** <@${interaction.user.id}>\n\n**${translations.translate('MATERIAL_LOCALIZATION')}:** ${localization}\n**${translations.translate('MATERIAL_QUANTITY_GIVEN')}:** ${material.quantityGiven} / ${material.quantityAsk}`,
					components: [new ActionRowBuilder().addComponents(removeButton)],
				});
			}

			await interaction.update({
				content: `**${translations.translate('ID')}:** ${materialId}\n**${translations.translate('MATERIAL_CREATOR')}:** <@${material.owner_id}>\n**${translations.translate('MATERIAL')}:** ${material.name}\n**${translations.translate('QUANTITY')}:** ${material.quantityAsk}\n**${translations.translate('MATERIAL_PERSON_IN_CHARGE')}:** <@${interaction.user.id}>\n\n**${translations.translate('MATERIAL_LOCALIZATION')}:** ${localization}\n**${translations.translate('MATERIAL_QUANTITY_GIVEN')}:** ${material.quantityGiven} / ${material.quantityAsk}`,
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
