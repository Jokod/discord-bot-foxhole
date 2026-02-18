const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { Material } = require('../../../../../data/models.js');
const ResponseMaterial = require('../../../../../utils/interaction/response_material.js');
const Translate = require('../../../../../utils/translations.js');
const { canManageMaterial } = require('../../../../../utils/material-permissions.js');
const { PRIORITY_LOW, PRIORITY_NEUTRAL, PRIORITY_HIGH } = require('../../../../../utils/material-priority.js');
const { getPriorityTranslationKey, getPriorityColoredText } = require('../../../../../utils/material-priority.js');
const { safeEscapeMarkdown } = require('../../../../../utils/markdown.js');

module.exports = {
	id: ['button_logistics_priority_low', 'button_logistics_priority_neutral', 'button_logistics_priority_high'],

	async execute(interaction) {
		const { client, guild, message, customId } = interaction;
		const translations = new Translate(client, guild.id);

		const priorityMap = {
			'button_logistics_priority_low': PRIORITY_LOW,
			'button_logistics_priority_neutral': PRIORITY_NEUTRAL,
			'button_logistics_priority_high': PRIORITY_HIGH,
		};

		const priority = priorityMap[customId];

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

			await Material.updateOne({ guild_id: guild.id, material_id: `${message.id}` }, { priority });

			const materialUpdated = await Material.findOne({ guild_id: guild.id, material_id: `${message.id}` });

			if (!materialUpdated) {
				return await interaction.reply({
					content: translations.translate('MATERIAL_NOT_EXIST'),
					flags: 64,
				});
			}

			if (materialUpdated.status === 'confirmed') {
				const baseName = materialUpdated.name || '';
				const name = baseName ? baseName.charAt(0).toUpperCase() + baseName.slice(1) : translations.translate('NONE');
				const priorityLabel = getPriorityColoredText(materialUpdated.priority, translations.translate(getPriorityTranslationKey(materialUpdated.priority)));
				const person = materialUpdated.person_id ? `<@${materialUpdated.person_id}>` : translations.translate('NONE');

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

				const content = `**${translations.translate('MATERIAL_CREATOR')}:** <@${materialUpdated.owner_id}>\n**${translations.translate('MATERIAL')}:** ${safeEscapeMarkdown(
					name,
				)}\n**${translations.translate('QUANTITY')}:** ${materialUpdated.quantityAsk}\n**${translations.translate('MATERIAL_PRIORITY')}:** ${priorityLabel}\n**${translations.translate('MATERIAL_PERSON_IN_CHARGE')}:** ${person}`;

				return await interaction.update({
					content,
					components: [actionRow],
				});
			}

			await new ResponseMaterial(interaction, materialUpdated).response();
		}
		catch (err) {
			console.error(err);
			return await interaction.reply({
				content: translations.translate('MATERIAL_UPDATE_ERROR'),
				flags: 64,
			});
		}
	},
};
