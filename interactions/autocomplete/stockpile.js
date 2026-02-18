const { Stockpile } = require('../../data/models.js');

module.exports = {
	name: 'stockpile',
	init: true,

	/**
	 * @param {import('discord.js').AutocompleteInteraction & { client: import('../../typings').Client }} interaction
	 */
	async execute(interaction) {
		const { guild, options } = interaction;
		const subcommand = options.getSubcommand();
		const focused = options.getFocused(true);

		// On ne gère l'autocomplétion que pour l'option "id"
		if (focused.name !== 'id') {
			return interaction.respond([]);
		}

		const query = (focused.value || '').toString().trim().toLowerCase();

		const filter = { server_id: guild.id };
		if (subcommand === 'remove' || subcommand === 'reset') {
			filter.deleted = false;
		}
		else if (subcommand === 'restore') {
			filter.deleted = true;
		}

		const allStocks = await Stockpile.find(filter).limit(50).lean();

		const matches = allStocks
			.filter((s) => {
				if (!query) return true;
				const name = (s.name || '').toLowerCase();
				const id = (s.id || '').toString();
				return name.includes(query) || id.includes(query);
			})
			.slice(0, 25)
			.map((s) => ({
				name: `${s.name} (#${s.id})`,
				value: s.id.toString(),
			}));

		await interaction.respond(matches);
	},
};

