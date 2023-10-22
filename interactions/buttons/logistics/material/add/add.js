const { ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
const { Material } = require('../../../../../data/models.js');
const Translate = require('../../../../../utils/translations.js');

module.exports = {
	id: 'button_logistics_add',

	async execute(interaction) {
		const { client, channelId, guild } = interaction;
		const translations = new Translate(client, guild.id);

		const materialButton = new ButtonBuilder()
			.setCustomId('button_logistics_add_material')
			.setLabel(translations.translate('MATERIAL'))
			.setStyle(ButtonStyle.Primary);

		const quantityAskButton = new ButtonBuilder()
			.setCustomId('button_logistics_add_quantity_ask')
			.setLabel(translations.translate('QUANTITY'))
			.setStyle(ButtonStyle.Secondary);

		const confirmButton = new ButtonBuilder()
			.setCustomId('button_logistics_add_confirm')
			.setLabel(translations.translate('CONFIRM'))
			.setStyle(ButtonStyle.Success);

		const deleteButton = new ButtonBuilder()
			.setCustomId('button_logistics_material_delete')
			.setLabel(translations.translate('DELETE'))
			.setStyle(ButtonStyle.Danger);

		const ActionRow = new ActionRowBuilder().addComponents(materialButton, quantityAskButton, confirmButton, deleteButton);

		try {
			await Material.create({
				guild_id: interaction.guild.id,
				material_id: interaction.id,
				group_id: channelId,
				owner_id: interaction.user.id,
				status: 'pending',
			});

			const message = await interaction.reply({
				content: `${translations.translate('MATERIAL_CREATOR')} <@${interaction.user.id}>`,
				components: [ActionRow],
				fetchReply: true,
			});

			await Material.updateOne({ guild_id: guild.id, material_id: `${interaction.id}` }, { material_id: `${message.id}` });
		}
		catch (err) {
			console.error(err);
			return await interaction.reply({
				content: translations.translate('MATERIAL_CREATE_ERROR'),
				ephemeral: true,
			});
		}
	},
};
