const { ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
const { Operation } = require('../../../data/models.js');
const { getHeavyArms } = require('../../../data/fournis.js');

module.exports = {
	id: 'logistics_select_material_heavy_arms',

	async execute(interaction) {
		const operationId = interaction.customId.split('-')[1];
		const threadId = interaction.customId.split('-')[2];
		const materialId = interaction.customId.split('-')[3];
		const operation = await Operation.findOne({ where: { operation_id: operationId } });

		const buttonBack = new ButtonBuilder()
			.setCustomId(`button_logistics_add_material-${operationId}-${threadId}-${materialId}`)
			.setLabel('Retour')
			.setStyle(ButtonStyle.Secondary);

		const heavyArmsRow = getHeavyArms({ operationId, threadId, materialId });
		const buttonArrowRow = new ActionRowBuilder().addComponents(buttonBack);

		await interaction.update({
			content: `**ID:** ${materialId}\nListe des armes lourdes disponibles pour l'opération **${operation.get('title')}**`,
			components: [...heavyArmsRow, buttonArrowRow],
		});
	},
};
