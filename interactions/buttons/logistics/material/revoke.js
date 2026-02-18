const { ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
const { Material } = require('../../../../data/models.js');
const Translate = require('../../../../utils/translations.js');
const { getPriorityTranslationKey, getPriorityColoredText } = require('../../../../utils/material-priority.js');
const { safeEscapeMarkdown } = require('../../../../utils/markdown.js');

module.exports = {
	id: 'button_logistics_revoke',

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
			let material = await Material.findOne({ guild_id: guild.id, material_id: `${message.id}` });

			if (!material) {
				return await interaction.reply({
					content: translations.translate('MATERIAL_NOT_EXIST'),
					flags: 64,
				});
			}

			if (interaction.user.id !== material.person_id) {
				return await interaction.reply({
					content: translations.translate('MATERIAL_ARE_NO_OWNER_ERROR'),
					flags: 64,
				});
			}

			await Material.updateOne({ guild_id: guild.id, material_id: `${message.id}` }, { person_id: null });

			material = await Material.findOne({ guild_id: guild.id, material_id: `${message.id}` });

			const baseName = material.name || '';
			const name = baseName ? baseName.charAt(0).toUpperCase() + baseName.slice(1) : translations.translate('NONE');
			const localization = material.localization ? material.localization : translations.translate('NONE');
			const person = material.person_id ? `<@${material.person_id}>` : translations.translate('NONE');
			const priorityLabel = getPriorityColoredText(material.priority, translations.translate(getPriorityTranslationKey(material.priority)));

			await interaction.update({
				content: `**${translations.translate('MATERIAL_CREATOR')}:** <@${material.owner_id}>\n**${translations.translate('MATERIAL')}:** ${safeEscapeMarkdown(
					name,
				)}\n**${translations.translate('QUANTITY')}:** ${material.quantityAsk}\n**${translations.translate('MATERIAL_PRIORITY')}:** ${priorityLabel}\n**${translations.translate('MATERIAL_PERSON_IN_CHARGE')}:** ${person}\n\n**${translations.translate('MATERIAL_LOCALIZATION')}:** ${safeEscapeMarkdown(
					localization,
				)}\n**${translations.translate('MATERIAL_QUANTITY_GIVEN')}:** ${material.quantityGiven} / ${material.quantityAsk}`,
				components: [actionRow],
			});
		}
		catch (err) {
			console.error(err);
			return await interaction.update({
				content: translations.translate('MATERIAL_ASSIGN_ERROR'),
				flags: 64,
			});
		}
	},
};
