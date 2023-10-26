const { ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
const { Material } = require('../../../../../data/models.js');
const { getMedical } = require('../../../../../data/fournis.js');
const Translate = require('../../../../../utils/translations.js');

module.exports = {
	init: true,
	id: 'logistics_select_material_medicals',

	async execute(interaction) {
		const { client, guild, message } = interaction;
		const translations = new Translate(client, guild.id);

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

		const buttonBack = new ButtonBuilder()
			.setCustomId('button_logistics_add_material')
			.setLabel(translations.translate('BACK'))
			.setStyle(ButtonStyle.Secondary);

		const vehcilesRow = await getMedical(guild.id);
		const buttonArrowRow = new ActionRowBuilder().addComponents(buttonBack);

		await interaction.update({
			content: `${translations.translate('MATERIAL_LIST_RESOURCES')}`,
			components: [...vehcilesRow, buttonArrowRow],
		});
	},
};
