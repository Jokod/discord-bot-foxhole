const { EmbedBuilder, SlashCommandBuilder, ApplicationCommandOptionType } = require('discord.js');
const { getRandomColor } = require('../../../utils/colors.js');
const Translate = require('../../../utils/translations.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('help')
		.setNameLocalizations({
			fr: 'aide',
			ru: 'помощь',
			'zh-CN': '帮助',
		})
		.setDescription(
			'List all of my commands or info about a specific command.',
		)
		.setDescriptionLocalizations({
			fr: 'Liste toutes mes commandes ou des informations sur une commande spécifique.',
			ru: 'Список всех моих команд или информация о конкретной команде.',
			'zh-CN': '列出所有命令或有关特定命令的信息。',
		})
		.addStringOption((option) =>
			option
				.setName('command')
				.setNameLocalizations({
					fr: 'commande',
					ru: 'команда',
					'zh-CN': '命令',
				})
				.setDescription('The command to get help for.')
				.setDescriptionLocalizations({
					fr: 'La commande pour obtenir de l\'aide.',
					ru: 'Команда для получения помощи.',
					'zh-CN': '要获取帮助的命令。',
				}),
		),

	async execute(interaction) {

		const guildId = interaction.guild?.id;
		const translations = new Translate(interaction.client, guildId);
		let currentLang = interaction.client.traductions.get(guildId);
		if (!interaction.client.languages.has(currentLang)) currentLang = 'en';

		const helpEmbed = new EmbedBuilder().setColor(getRandomColor());

		const rawName = interaction.options.getString('command');

		let name = rawName;

		if (name) {
			name = name.toLowerCase().trim();

			const parts = name.split(/\s+/);
			let baseName = parts[0];
			// Autoriser \"help /material\" ou \"help material\" indistinctement
			if (baseName.startsWith('/')) {
				baseName = baseName.slice(1);
			}
			const subPath = parts.slice(1);

			helpEmbed.setTitle(
				translations.translate('HELP_TITLE_COMMAND', { command: rawName }),
			);

			// Résolution de la commande :
			// 1) par son nom interne (anglais)
			// 2) sinon par son nom localisé dans la langue courante (ex: "matériel" en FR)
			//    avec comparaison insensible aux accents pour accepter "materiel".
			let command = interaction.client.slashCommands.get(baseName);
			if (!command) {
				const normalize = (str) =>
					str
						.toLowerCase()
						.normalize('NFD')
						.replace(/[\u0300-\u036f]/g, '');

				const normalizedBase = normalize(baseName);

				for (const candidate of interaction.client.slashCommands.values()) {
					const json = candidate.data.toJSON();
					const locs = json.name_localizations || {};
					const locName = locs[currentLang];
					if (!locName) continue;

					if (normalize(locName) === normalizedBase) {
						command = candidate;
						break;
					}
				}
			}

			if (command) {
				// Utilise la version JSON pour avoir une structure stable (options, sous-commandes, etc.)
				const data = command.data.toJSON();

				// Aide pour une sous-commande spécifique, ex: \"material help\"
				if (subPath.length > 0) {
					const options = data.options ?? [];

					let targetSub = null;

					if (subPath.length === 1) {
						// /cmd <sub>
						targetSub = options.find(
							(o) =>
								o.type === ApplicationCommandOptionType.Subcommand &&
								o.name === subPath[0],
						);
					}
					else if (subPath.length === 2) {
						// /cmd <group> <sub>
						const group = options.find(
							(o) =>
								o.type === ApplicationCommandOptionType.SubcommandGroup &&
								o.name === subPath[0],
						);
						if (group && Array.isArray(group.options)) {
							targetSub = group.options.find(
								(o) =>
									o.type === ApplicationCommandOptionType.Subcommand &&
									o.name === subPath[1],
							);
						}
					}

					if (!targetSub) {
						helpEmbed
							.setDescription(
								translations.translate('HELP_COMMAND_NOT_FOUND', {
									command: rawName,
								}),
							)
							.setColor(0xFF0000);
					}
					else {
						const localizedSubDesc =
							(targetSub.description_localizations &&
								targetSub.description_localizations[currentLang]) ||
							targetSub.description ||
							'';
						let description = localizedSubDesc;
						const params = targetSub.options ?? [];

						const paramsLabel = translations.translate(
							'HELP_SECTION_PARAMETERS',
						);
						description += `\n\n**${paramsLabel}:**\n`;

						if (params.length > 0) {
							const lines = params.map((p) => {
								const requiredSuffix = p.required
									? translations.translate('HELP_PARAM_REQUIRED_SUFFIX')
									: '';
								const paramName =
									(p.name_localizations &&
										p.name_localizations[currentLang]) ||
									p.name;
								const paramDesc =
									(p.description_localizations &&
										p.description_localizations[currentLang]) ||
									p.description ||
									'';
								return `• \`${paramName}\`${requiredSuffix} – ${paramDesc}`;
							});
							description += lines.join('\n');
						}
						else {
							description += translations.translate('HELP_NO_PARAMS');
						}
						helpEmbed.setDescription(description);
					}
				}
				// Aide pour la commande de base (sans sous-chemin)
				else if (data.description) {
					const localizedDesc =
						(data.description_localizations &&
							data.description_localizations[currentLang]) ||
						data.description ||
						'';
					let description = localizedDesc;

					// List subcommands and/or parameters if any (e.g. /foxhole, /war, /server, ...)
					const options = data.options ?? [];
					const subcommands = options.filter(
						(o) =>
							o.type === ApplicationCommandOptionType.Subcommand ||
							o.type === ApplicationCommandOptionType.SubcommandGroup,
					);
					const params = options.filter(
						(o) =>
							o.type !== ApplicationCommandOptionType.Subcommand &&
							o.type !== ApplicationCommandOptionType.SubcommandGroup,
					);

					const hasSubcommands = subcommands.length > 0;
					const hasParams = params.length > 0;

					// Sous-commandes
					const commandJson = command.data.toJSON();
					const baseDisplayName =
						(commandJson.name_localizations &&
							commandJson.name_localizations[currentLang]) ||
						commandJson.name;
					const subsLabel = translations.translate('HELP_SECTION_SUBCOMMANDS');
					description += `\n\n**${subsLabel}:**\n`;

					if (hasSubcommands) {
						const lines = [];

						for (const opt of subcommands) {
							if (opt.type === ApplicationCommandOptionType.Subcommand) {
								const subJson = opt;
								const subDisplayName =
									(subJson.name_localizations &&
										subJson.name_localizations[currentLang]) ||
									subJson.name;
								const subDesc =
									(opt.description_localizations &&
										opt.description_localizations[currentLang]) ||
									opt.description ||
									'';
								lines.push(
									`• \`/${baseDisplayName} ${subDisplayName}\` – ${subDesc}`,
								);
							}
							else if (
								opt.type === ApplicationCommandOptionType.SubcommandGroup &&
								Array.isArray(opt.options)
							) {
								for (const sub of opt.options) {
									if (sub.type === ApplicationCommandOptionType.Subcommand) {
										const subDisplayName =
											(sub.name_localizations &&
												sub.name_localizations[currentLang]) ||
											sub.name;
										const subDesc =
											(sub.description_localizations &&
												sub.description_localizations[currentLang]) ||
											sub.description ||
											'';
										lines.push(
											`• \`/${baseDisplayName} ${opt.name} ${subDisplayName}\` – ${subDesc}`,
										);
									}
								}
							}
						}

						if (lines.length > 0) {
							description += lines.join('\n');
						}
						else {
							description += translations.translate('HELP_NO_SUBCOMMANDS');
						}
					}
					else {
						description += translations.translate('HELP_NO_SUBCOMMANDS');
					}

					// Paramètres
					const paramsLabel = translations.translate('HELP_SECTION_PARAMETERS');
					description += `\n\n**${paramsLabel}:**\n`;

					if (hasParams) {
						const allCommands =
							data.name === 'help'
								? interaction.client.slashCommands.map((cmd) => {
									const json = cmd.data.toJSON();
									const locs = json.name_localizations || {};
									return locs[currentLang] || json.name;
								})
								: null;

						const lines = params.map((p) => {
							const requiredSuffix = p.required
								? translations.translate('HELP_PARAM_REQUIRED_SUFFIX')
								: '';
							const paramName =
								(p.name_localizations &&
									p.name_localizations[currentLang]) ||
								p.name;
							const baseDesc =
								(p.description_localizations &&
									p.description_localizations[currentLang]) ||
								p.description ||
								'';

							let paramDesc = baseDesc;
							if (data.name === 'help' && p.name === 'command' && allCommands) {
								paramDesc +=
									' ' +
									translations.translate('HELP_PARAM_HELP_COMMAND_VALUES', {
										commands: '`' + allCommands.join('`, `') + '`',
									});
							}

							return `• \`${paramName}\`${requiredSuffix} – ${paramDesc}`;
						});

						description += lines.join('\n');
					}
					else {
						description += translations.translate('HELP_NO_PARAMS');
					}

					helpEmbed.setDescription(description);
				}
			}
			else {
				helpEmbed
					.setDescription(
						translations.translate('HELP_COMMAND_NOT_FOUND', {
							command: rawName,
						}),
					)
					.setColor(0xFF0000);
			}
		}
		else {
			// Give a list of all the commands

			const allCommands = interaction.client.slashCommands.map((command) => {
				const json = command.data.toJSON();
				const locs = json.name_localizations || {};
				return (locs[currentLang] || json.name);
			});

			helpEmbed
				.setTitle(translations.translate('HELP_TITLE_LIST'))
				.setDescription('`' + allCommands.join('`, `') + '`');
		}

		// Replies to the interaction!

		await interaction.reply({
			embeds: [helpEmbed],
			flags: 64,
		});
	},
};
