const { ButtonBuilder, ButtonStyle, ActionRowBuilder, Collection } = require('discord.js');
const { Operation, Group } = require('../../../data/models.js');

module.exports = {
	id: 'button_create_operation_logistics',

	async execute(interaction) {
		const { client, channel } = interaction;

		const operationId = interaction.customId.split('-')[1];
		const operation = await Operation.findOne({ operation_id: `${operationId}` });

		if (!client.logistics) {client.logistics = new Collection();}

		const logisticId = client.logistics.size + 1;

		const thread = await channel.threads.create({
			name: `Logistique #${logisticId} pour l'opération ${operation.title}`,
		});

		if (thread.joinable) await thread.join();

		const addButton = new ButtonBuilder()
			.setCustomId(`button_logistics_add-${operationId}-${thread.id}`)
			.setLabel('Ajouter un matériel')
			.setStyle(ButtonStyle.Primary);

		const removeButton = new ButtonBuilder()
			.setCustomId(`button_logistics_remove-${operationId}-${thread.id}`)
			.setLabel('Retirer un matériel')
			.setStyle(ButtonStyle.Danger);

		const actionRow = new ActionRowBuilder().addComponents(addButton, removeButton);

		try {

			await Group.create({
				threadId: thread.id,
				operation_id: operationId,
				materials: null,
			});

			await thread.send({
				components: [actionRow],
			});

			await interaction.reply({
				content: 'Thread de logistique créé !',
				ephemeral: true,
			});
		}
		catch (err) {
			console.error(err);
			return await interaction.reply({
				content: 'Une erreur s\'est produite lors de l\'implémentation de la logistique !',
				ephemeral: true,
			});
		}
	},
};
