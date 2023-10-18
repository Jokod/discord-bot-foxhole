const { ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
const { Material } = require('../../../../data/models.js');
const Translate = require('../../../../utils/translations.js');

module.exports = {
	id: 'button_logistics_assignee',

	async execute(interaction) {
		const { client, guild, message } = interaction;
		const translations = new Translate(client, guild.id);

		const revokeButton = new ButtonBuilder()
			.setCustomId('button_logistics_revoke')
			.setLabel(translations.translate('REVOKE'))
			.setStyle(ButtonStyle.Danger);

		const validateButton = new ButtonBuilder()
			.setCustomId('button_logistics_material_validate')
			.setLabel(translations.translate('VALIDATE'))
			.setStyle(ButtonStyle.Success);

		const removeButton = new ButtonBuilder()
			.setCustomId('button_logistics_material_delete')
			.setLabel(translations.translate('DELETE'))
			.setStyle(ButtonStyle.Danger);

		const actionRow = new ActionRowBuilder().addComponents(revokeButton, validateButton, removeButton);

		try {
			await Material.updateOne({ material_id: `${message.id}` }, { person_id: interaction.user.id });

			const material = await Material.findOne({ material_id: `${message.id}` });

			const name = material.name.charAt(0).toUpperCase() + material.name.slice(1);
			const localization = material.localization ? material.localization : translations.translate('NONE');
			const person = material.person_id ? `<@${material.person_id}>` : translations.translate('NONE');

			await interaction.update({
				content: `**${translations.translate('MATERIAL_CREATOR')}:** <@${material.owner_id}>\n**${translations.translate('MATERIAL')}:** ${name}\n**${translations.translate('QUANTITY')}:** ${material.quantityAsk}\n**${translations.translate('MATERIAL_PERSON_IN_CHARGE')}:** ${person}\n\n**${translations.translate('MATERIAL_LOCALIZATION')}:** ${localization}\n**${translations.translate('MATERIAL_QUANTITY_GIVEN')}:** ${material.quantityGiven} / ${material.quantityAsk}`,
				components: [actionRow],
			});
		}
		catch (err) {
			console.error(err);
			return await interaction.update({
				content: translations.translate('MATERIAL_ASSIGN_ERROR'),
				ephemeral: true,
			});
		}
	},
};
