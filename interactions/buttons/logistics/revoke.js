const { ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
const { Material } = require('../../../data/models.js');
const Translate = require('../../../utils/translations.js');

module.exports = {
	id: 'button_logistics_revoke',

	async execute(interaction) {
		const operationId = interaction.customId.split('-')[1];
		const threadId = interaction.customId.split('-')[2];
		const materialId = interaction.customId.split('-')[3];
		const translations = new Translate(interaction.client, interaction.guild.id);

		const assigneeButton = new ButtonBuilder()
			.setCustomId(`button_logistics_assignee-${operationId}-${threadId}-${materialId}`)
			.setLabel(translations.translate('ASSIGNEE'))
			.setStyle(ButtonStyle.Primary);

		const actionRow = new ActionRowBuilder().addComponents(assigneeButton);

		try {
			const material = await Material.findOne({ material_id: `${materialId}` });

			if (interaction.user.id !== material.owner_id) {
				return await interaction.reply({
					content: translations.translate('MATERIAL_ARE_NO_OWNER_ERROR'),
					ephemeral: true,
				});
			}

			await Material.updateOne({ material_id: `${materialId}` }, { owner_id: null });

			const name = material.name.charAt(0).toUpperCase() + material.name.slice(1);

			await interaction.update({
				content: `**${translations.translate('ID')}:** ${materialId}\n**${translations.translate('MATERIAL')}:** ${name}\n**${translations.translate('QUANTITY')}:** ${material.quantityAsk}\n**${translations.translate('MATERIAL_PERSON_IN_CHARGE')}:** ${translations.translate('NONE')}`,
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
