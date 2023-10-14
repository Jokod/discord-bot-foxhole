const { ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
const { Operation, Material } = require('../../../data/models.js');
const Translate = require('../../../utils/translations.js');

module.exports = {
	id: 'button_create_operation_start',

	async execute(interaction) {
		const operationId = interaction.customId.split('-')[1];
		const translations = new Translate(interaction.client, interaction.guild.id);

		try {
			const operation = await Operation.findOne({ operation_id: `${operationId}` });

			if (interaction.user.id !== operation.owner_id) {
				return await interaction.reply({
					content: translations.translate('OPERATION_ARE_NO_OWNER_ERROR'),
					ephemeral: true,
				});
			}

			let validated = 0;
			const materials = await Material.find({ operation_id: `${operationId}` })
				.then(material => {
					if (material.status === 'validated') validated++;
				});

			if (materials && validated !== materials.length) {
				await interaction.reply({
					content: translations.translate('OPERATION_MATERIALS_NOT_ALL_VALIDATE'),
					ephemeral: true,
				});

				return await interaction.followUp({
					content: translations.translate('LOGISTIC_SEE_MATERIALS_NOT_VALIDATE'),
					ephemeral: true,
				});
			}

			const finishedButton = new ButtonBuilder()
				.setCustomId(`button_create_operation_finished-${operationId}`)
				.setLabel(translations.translate('FINISHED'))
				.setStyle(ButtonStyle.Success);

			const cancelButton = new ButtonBuilder()
				.setCustomId(`button_create_operation_cancel-${operationId}`)
				.setLabel(translations.translate('CANCEL'))
				.setStyle(ButtonStyle.Danger);

			const ActionRow = new ActionRowBuilder().addComponents(finishedButton, cancelButton);

			const content = `**${translations.translate('ID')}:** ${operationId}\n**${translations.translate('OPERATION_CREATOR')}:** <@${operation.owner_id}>\n**${translations.translate('DATE')}:** ${operation.date}\n**${translations.translate('HOURS')}:** ${operation.time}\n**${translations.translate('DURATION')}:** ${operation.duration} min\n**${translations.translate('DESCRIPTION')}:** ${operation.description}`;

			await Operation.updateOne({ operation_id: `${operationId}` }, { status: 'started' });

			await interaction.update({
				content: `${translations.translate('OPERATION_LAUNCH_SUCCESS', { title: operation.title })}\n${content}`,
				components: [ActionRow],
			});
		}
		catch (err) {
			console.error(err);
			return await interaction.reply({
				content: translations.translate('OPERATION_LAUNCH_ERROR'),
				ephemeral: true,
			});
		}
	},
};
