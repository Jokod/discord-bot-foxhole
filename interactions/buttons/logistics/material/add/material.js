const { ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
const { Material } = require('../../../../../data/models.js');
const Translate = require('../../../../../utils/translations.js');

module.exports = {
	id: 'button_logistics_add_material',

	async execute(interaction) {
		const { client, guild, message } = interaction;
		const translations = new Translate(client, guild.id);

		const buttonSmallArms = new ButtonBuilder()
			.setCustomId('logistics_select_material_small_arms')
			.setLabel(translations.translate('MATERIAL_SMALL_ARMS'))
			.setStyle(ButtonStyle.Primary);

		const buttonHeavyArms = new ButtonBuilder()
			.setCustomId('logistics_select_material_heavy_arms')
			.setLabel(translations.translate('MATERIAL_HEAVY_ARMS'))
			.setStyle(ButtonStyle.Primary);

		const buttonUtilities = new ButtonBuilder()
			.setCustomId('logistics_select_material_utilities')
			.setLabel(translations.translate('MATERIAL_UTILITIES'))
			.setStyle(ButtonStyle.Primary);

		const buttonShipables = new ButtonBuilder()
			.setCustomId('logistics_select_material_shipables')
			.setLabel(translations.translate('MATERIAL_SHIPABLES'))
			.setStyle(ButtonStyle.Primary);

		const buttonVehicles = new ButtonBuilder()
			.setCustomId('logistics_select_material_vehicles')
			.setLabel(translations.translate('MATERIAL_VEHICLES'))
			.setStyle(ButtonStyle.Primary);

		const buttonUniforms = new ButtonBuilder()
			.setCustomId('logistics_select_material_uniforms')
			.setLabel(translations.translate('MATERIAL_UNIFORMS'))
			.setStyle(ButtonStyle.Primary);

		const buttonResources = new ButtonBuilder()
			.setCustomId('logistics_select_material_resources')
			.setLabel(translations.translate('MATERIAL_RESOURCES'))
			.setStyle(ButtonStyle.Primary);

		const buttonMedical = new ButtonBuilder()
			.setCustomId('logistics_select_material_medicals')
			.setLabel(translations.translate('MATERIAL_MEDICAL'))
			.setStyle(ButtonStyle.Primary);

		const buttonBack = new ButtonBuilder()
			.setCustomId('logistics_select_material_back')
			.setLabel(translations.translate('BACK'))
			.setStyle(ButtonStyle.Secondary);

		const firstArrowRow = new ActionRowBuilder().addComponents(buttonSmallArms, buttonUtilities, buttonHeavyArms, buttonMedical);
		const secondArrowRow = new ActionRowBuilder().addComponents(buttonShipables, buttonVehicles, buttonUniforms, buttonResources);
		const thirdArrowRow = new ActionRowBuilder().addComponents(buttonBack);

		try {
			const material = await Material.findOne({ guild_id: guild.id, material_id: `${message.id}` });

			if (!material) {
				return await interaction.reply({
					content: translations.translate('MATERIAL_NOT_EXIST'),
					ephemeral: true,
				});
			}

			if (interaction.user.id !== material.owner_id) {
				return await interaction.reply({
					content: translations.translate('MATERIAL_ARE_NO_CREATOR_ERROR'),
					ephemeral: true,
				});
			}

			await interaction.update({
				content: `${translations.translate('MATERIAL_SELECT_TYPE')}`,
				components: [firstArrowRow, secondArrowRow, thirdArrowRow],
			});
		}
		catch (error) {
			console.error(error);
			await interaction.reply({
				content: translations.translate('MATERIAL_CREATE_ERROR'),
				ephemeral: true,
			});
		}
	},
};
