const { ApplicationCommandOptionType } = require('discord.js');

function normalize(str) {
	return String(str || '')
		.toLowerCase()
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '');
}

function localizedName(obj, lang) {
	return (obj.name_localizations && obj.name_localizations[lang]) || obj.name;
}

function collectSuggestions(slashCommands, lang) {
	const out = [];

	for (const command of slashCommands.values()) {
		const data = command.data.toJSON();
		const base = localizedName(data, lang);
		out.push({ name: `/${base}`, value: data.name });

		for (const opt of data.options || []) {
			if (opt.type === ApplicationCommandOptionType.Subcommand) {
				const sub = localizedName(opt, lang);
				out.push({
					name: `/${base} ${sub}`,
					value: `${data.name} ${opt.name}`,
				});
			}
			else if (
				opt.type === ApplicationCommandOptionType.SubcommandGroup
				&& Array.isArray(opt.options)
			) {
				const group = localizedName(opt, lang);
				for (const sub of opt.options) {
					if (sub.type !== ApplicationCommandOptionType.Subcommand) continue;
					const subName = localizedName(sub, lang);
					out.push({
						name: `/${base} ${group} ${subName}`,
						value: `${data.name} ${opt.name} ${sub.name}`,
					});
				}
			}
		}
	}

	return out;
}

module.exports = {
	name: 'help',
	init: false,

	/**
	 * @param {import('discord.js').AutocompleteInteraction & { client: import('../../typings').Client }} interaction
	 */
	async execute(interaction) {
		const guildId = interaction.guild?.id;
		let lang = interaction.client.traductions?.get(guildId) || 'en';
		if (!interaction.client.languages?.has(lang)) lang = 'en';

		const focused = String(interaction.options.getFocused() || '').trim();
		const query = normalize(focused);
		const suggestions = collectSuggestions(interaction.client.slashCommands, lang);

		const filtered = query
			? suggestions.filter((s) => {
				const hay = normalize(`${s.name} ${s.value}`);
				return hay.includes(query);
			})
			: suggestions;

		return interaction.respond(
			filtered.slice(0, 25).map((s) => ({
				name: s.name.slice(0, 100),
				value: s.value.slice(0, 100),
			})),
		);
	},
};
