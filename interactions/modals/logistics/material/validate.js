const { ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
const { Material, Stats } = require('../../../../data/models.js');
const Translate = require('../../../../utils/translations.js');
const { getPriorityTranslationKey, getPriorityColoredText } = require('../../../../utils/material-priority.js');

module.exports = {
	id: 'modal_logistics_material_validate',

	async execute(interaction) {
		const { client, guild, message } = interaction;
		const translations = new Translate(client, guild.id);

		const localization = interaction.fields.getTextInputValue('localization');
		const quantityGiven = interaction.fields.getTextInputValue('quantity_given');

		const localizationRegex = new RegExp('^[\\w\\s!@#]{1,100}$');
		const quantityRegex = new RegExp('^[0-9]{1,5}$');

		if (isNaN(quantityGiven) || quantityGiven < 0 || !quantityRegex.test(quantityGiven)) {
			return await interaction.reply({
				content: translations.translate('MATERIAL_QUANTITY_ERROR'),
				flags: 64,
			});
		}

		if (!localization || !localizationRegex.test(localization)) {
			return await interaction.reply({
				content: translations.translate('MATERIAL_LOCALIZATION_ERROR'),
				flags: 64,
			});
		}

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
			let status = 'pending';

			if (!material) {
				return await interaction.reply({
					content: translations.translate('MATERIAL_NOT_EXIST'),
					flags: 64,
				});
			}

			const quantityTotalGiven = parseInt(material.quantityGiven) + parseInt(quantityGiven);

			if (quantityTotalGiven >= material.quantityAsk) {
				status = 'validated';
			}
			else {
				status = 'confirmed';
			}

			const updateData = {
				localization,
				quantityGiven: quantityTotalGiven,
				status,
				person_id: null,
			};

			material = await Material.findOneAndUpdate(
				{ material_id: `${message.id}` },
				updateData,
				{ new: true });

			if (status === 'validated') {
				await Stats.findOneAndUpdate(
					{ guild_id: guild.id },
					{ $inc: { material_validated_count: 1 } },
					{ upsert: true },
				);
			}

			if (!material) {
				return await interaction.reply({
					content: translations.translate('MATERIAL_NOT_EXIST'),
					flags: 64,
				});
			}

			const priorityLabel = getPriorityColoredText(material.priority, translations.translate(getPriorityTranslationKey(material.priority)));

			if (material.quantityGiven >= material.quantityAsk) {
				return await interaction.update({
					content: `**${translations.translate('MATERIAL_CREATOR')}:** <@${material.owner_id}>\n**${translations.translate('MATERIAL')}:** ${material.name}\n**${translations.translate('QUANTITY')}:** ${material.quantityAsk}\n**${translations.translate('MATERIAL_PRIORITY')}:** ${priorityLabel}\n**${translations.translate('MATERIAL_PERSON_IN_CHARGE')}:** ${translations.translate('NONE')}\n\n**${translations.translate('MATERIAL_LOCALIZATION')}:** ${localization}\n**${translations.translate('MATERIAL_QUANTITY_GIVEN')}:** ${material.quantityGiven} / ${material.quantityAsk}`,
					components: [new ActionRowBuilder().addComponents(removeButton)],
				});
			}

			await interaction.update({
				content: `**${translations.translate('MATERIAL_CREATOR')}:** <@${material.owner_id}>\n**${translations.translate('MATERIAL')}:** ${material.name}\n**${translations.translate('QUANTITY')}:** ${material.quantityAsk}\n**${translations.translate('MATERIAL_PRIORITY')}:** ${priorityLabel}\n**${translations.translate('MATERIAL_PERSON_IN_CHARGE')}:** ${translations.translate('NONE')}\n\n**${translations.translate('MATERIAL_LOCALIZATION')}:** ${localization}\n**${translations.translate('MATERIAL_QUANTITY_GIVEN')}:** ${material.quantityGiven} / ${material.quantityAsk}`,
				components: [actionRow],
			});
		}
		catch (err) {
			console.error(err);
			return await interaction.reply({
				content: translations.translate('MATERIAL_VALIDATE_ERROR'),
				flags: 64,
			});
		}
	},
};
