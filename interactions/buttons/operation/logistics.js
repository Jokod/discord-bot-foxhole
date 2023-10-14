const { ButtonBuilder, ButtonStyle, ActionRowBuilder, Collection } = require('discord.js');
const { Operation, Group } = require('../../../data/models.js');
const Translate = require('../../../utils/translations.js');

module.exports = {
	id: 'button_create_operation_logistics',

	async execute(interaction) {
		const { channel, client, guild } = interaction;
		const translations = new Translate(client, guild.id);
		const operationId = interaction.customId.split('-')[1];

		try {
			const operation = await Operation.findOne({ operation_id: `${operationId}` });

			if (interaction.user.id !== operation.owner_id) {
				return await interaction.reply({
					content: translations.translate('OPERATION_ARE_NO_OWNER_ERROR'),
					ephemeral: true,
				});
			}

			const logistics = await Group.find({ operation_id: `${operationId}` });

			const logisticsIds = new Collection();

			logistics.forEach(logistic => {
				logisticsIds.set(logistic.threadId, logistic);
			});

			const thread = await channel.threads.create({
				name: translations.translate('GROUP_TITLE', { size: logisticsIds.size + 1, title: operation.title }),
			});

			if (thread.joinable) await thread.join();


			const addButton = new ButtonBuilder()
				.setCustomId(`button_logistics_add-${operationId}-${thread.id}`)
				.setLabel(translations.translate('MATERIAL_ADD'))
				.setStyle(ButtonStyle.Primary);

			const removeButton = new ButtonBuilder()
				.setCustomId(`button_logistics_remove-${operationId}-${thread.id}`)
				.setLabel(translations.translate('MATERIAL_REMOVE'))
				.setStyle(ButtonStyle.Danger);

			const closeThreadButton = new ButtonBuilder()
				.setCustomId(`button_logistics_close-${operationId}-${thread.id}`)
				.setLabel(translations.translate('DELETE'))
				.setStyle(ButtonStyle.Secondary);

			const actionRow = new ActionRowBuilder().addComponents(addButton, removeButton, closeThreadButton);


			await Group.create({
				threadId: thread.id,
				operation_id: operationId,
				owner_id: interaction.user.id,
				materials: null,
			});

			await thread.send({
				components: [actionRow],
			});

			await interaction.reply({
				content: translations.translate('GROUP_CREATE_SUCCESS'),
				ephemeral: true,
			});
		}
		catch (err) {
			console.error(err);
			return await interaction.reply({
				content: translations.translate('GROUP_CREATE_ERROR'),
				ephemeral: true,
			});
		}
	},
};
