module.exports = {
	name: 'stockpile',
	init: true,

	/**
	 * @param {import('discord.js').AutocompleteInteraction & { client: import('../../typings').Client }} interaction
	 */
	async execute(interaction) {
		// /stockpile add|list has no autocomplete options
		await interaction.respond([]);
	},
};
