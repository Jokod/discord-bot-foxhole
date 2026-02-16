const { ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
const { Material } = require('../../../../../data/models.js');
const Translate = require('../../../../../utils/translations.js');
const { canManageMaterial } = require('../../../../../utils/material-permissions.js');

module.exports = {
	id: 'button_logistics_add_priority',

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

			const lowButton = new ButtonBuilder()
				.setCustomId('button_logistics_priority_low')
				.setLabel(translations.translate('MATERIAL_PRIORITY_LOW'))
				.setStyle(ButtonStyle.Secondary);

			const neutralButton = new ButtonBuilder()
				.setCustomId('button_logistics_priority_neutral')
				.setLabel(translations.translate('MATERIAL_PRIORITY_NEUTRAL'))
				.setStyle(ButtonStyle.Primary);

			const highButton = new ButtonBuilder()
				.setCustomId('button_logistics_priority_high')
				.setLabel(translations.translate('MATERIAL_PRIORITY_HIGH'))
				.setStyle(ButtonStyle.Danger);

			const backButton = new ButtonBuilder()
				.setCustomId('logistics_select_material_back')
				.setLabel(translations.translate('BACK'))
				.setStyle(ButtonStyle.Secondary);

			const row1 = new ActionRowBuilder().addComponents(lowButton, neutralButton, highButton);
			const row2 = new ActionRowBuilder().addComponents(backButton);

			await interaction.update({
				content: `${translations.translate('MATERIAL_PRIORITY')}`,
				components: [row1, row2],
			});
		}
		catch (error) {
			console.error(error);
			await interaction.reply({
				content: translations.translate('MATERIAL_CREATE_ERROR'),
				flags: 64,
			});
		}
	},
};
