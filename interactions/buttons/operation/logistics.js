const { ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
const { Operation, Group } = require('../../../data/models.js');
const Translate = require('../../../utils/translations.js');

module.exports = {
	id: 'button_create_operation_logistics',

	async execute(interaction) {
		const { channel, client, guild, message, user } = interaction;
		const translations = new Translate(client, guild.id);

		try {
			const operation = await Operation.findOne({ guild_id: guild.id, operation_id: `${message.id}` });

			if (!operation) {
				return await interaction.reply({
					content: translations.translate('OPERATION_NOT_EXIST'),
					ephemeral: true,
				});
			}

			if (user.id !== operation.owner_id) {
				return await interaction.reply({
					content: translations.translate('OPERATION_ARE_NO_OWNER_ERROR'),
					ephemeral: true,
				});
			}

			const thread = await channel.threads.create({
				name: translations.translate('GROUP_TITLE', { size: operation.numberOfGroups + 1, title: operation.title }),
			});

			if (thread.joinable) await thread.join();

			const addButton = new ButtonBuilder()
				.setCustomId('button_logistics_add')
				.setLabel(translations.translate('MATERIAL_ADD'))
				.setStyle(ButtonStyle.Primary);

			const removeButton = new ButtonBuilder()
				.setCustomId('button_logistics_remove')
				.setLabel(translations.translate('MATERIAL_REMOVE'))
				.setStyle(ButtonStyle.Danger);

			const closeThreadButton = new ButtonBuilder()
				.setCustomId('button_logistics_close')
				.setLabel(translations.translate('DELETE'))
				.setStyle(ButtonStyle.Secondary);

			const actionRow = new ActionRowBuilder().addComponents(addButton, removeButton, closeThreadButton);

			await Group.create({
				guild_id: guild.id,
				threadId: thread.id,
				operation_id: message.id,
				owner_id: interaction.user.id,
				materials: null,
			});

			await Operation.updateOne({ guild_id: guild.id, operation_id: `${message.id}` }, { numberOfGroups: operation.numberOfGroups + 1 });

			await thread.send({ components: [actionRow] });

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
