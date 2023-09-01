const { StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ActionRowBuilder } = require("discord.js");
const { Operation } = require("../../../data/models.js");

module.exports = {
	id: "button_logistics_add_material",

	async execute(interaction) {
		const operationId = interaction.customId.split('-')[1];
		const threadId = interaction.customId.split('-')[2];
		const materialId = interaction.customId.split('-')[3];

		const operation = await Operation.findOne({ where: { operation_id: operationId } });

		const materialField = new StringSelectMenuBuilder()
			.setCustomId(`stringSelect_logistics_add_material-${operationId}-${threadId}-${materialId}`)
			.setPlaceholder('Sélectionnez un matériel')
			.addOptions(
				new StringSelectMenuOptionBuilder()
					.setLabel('Bulbasaur')
					.setDescription('The dual-type Grass/Poison Seed Pokémon.')
					.setValue('bulbasaur'),
				new StringSelectMenuOptionBuilder()
					.setLabel('Charmander')
					.setDescription('The Fire-type Lizard Pokémon.')
					.setValue('charmander'),
				new StringSelectMenuOptionBuilder()
					.setLabel('Squirtle')
					.setDescription('The Water-type Tiny Turtle Pokémon.')
					.setValue('squirtle'),
			);

		const ActionRow = new ActionRowBuilder().addComponents(materialField);

		await interaction.update({
			content: `Ajout d'un matériel à l'opération **${operation.get('title')}**`,
			components: [ActionRow],
		});
	},
};
