const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { Material } = require('../../../../../data/models.js');
const Translate = require('../../../../../utils/translations.js');
const { canManageMaterial } = require('../../../../../utils/material-permissions.js');
const { getPriorityTranslationKey, getPriorityColoredText } = require('../../../../../utils/material-priority.js');

module.exports = {
	id: 'button_logistics_add_confirm',

	async execute(interaction) {
		const { client, guild, message } = interaction;
		const translations = new Translate(client, guild.id);

		const assigneeButton = new ButtonBuilder()
			.setCustomId('button_logistics_assignee')
			.setLabel(translations.translate('ASSIGNEE'))
			.setStyle(ButtonStyle.Primary);

		const priorityButton = new ButtonBuilder()
			.setCustomId('button_logistics_add_priority')
			.setLabel(translations.translate('MATERIAL_PRIORITY'))
			.setStyle(ButtonStyle.Secondary);

		const removeButton = new ButtonBuilder()
			.setCustomId('button_logistics_material_delete')
			.setLabel(translations.translate('DELETE'))
			.setStyle(ButtonStyle.Danger);

		const actionRow = new ActionRowBuilder().addComponents(assigneeButton, priorityButton, removeButton);

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

			await Material.updateOne({ guild_id: guild.id, material_id: `${message.id}` }, { status: 'confirmed' });

			if (!material.name || !material.quantityAsk) {
				return await interaction.reply({
					content: translations.translate('MATERIAL_HAVE_NO_NAME_OR_QUANTITY'),
					flags: 64,
				});
			}

			const name = material.name.charAt(0).toUpperCase() + material.name.slice(1);
			const priorityLabel = getPriorityColoredText(material.priority, translations.translate(getPriorityTranslationKey(material.priority)));

			await interaction.update({
				content: `**${translations.translate('MATERIAL_CREATOR')}:** <@${material.owner_id}>\n**${translations.translate('MATERIAL')}:** ${name}\n**${translations.translate('QUANTITY')}:** ${material.quantityAsk}\n**${translations.translate('MATERIAL_PRIORITY')}:** ${priorityLabel}\n**${translations.translate('MATERIAL_PERSON_IN_CHARGE')}:** ${translations.translate('NONE')}`,
				components: [actionRow],
			});
		}
		catch (err) {
			console.error(err);
			return await interaction.reply({
				content: translations.translate('MATERIAL_CONFIRM_ERROR'),
				flags: 64,
			});
		}
	},
};
