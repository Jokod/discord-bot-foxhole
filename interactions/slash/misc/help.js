const { EmbedBuilder, SlashCommandBuilder, ApplicationCommandOptionType } = require('discord.js');
const { getRandomColor } = require('../../../utils/colors.js');
const Translate = require('../../../utils/translations.js');
const { safeEscapeMarkdown } = require('../../../utils/markdown.js');

const SUB_TYPES = new Set([
	ApplicationCommandOptionType.Subcommand,
	ApplicationCommandOptionType.SubcommandGroup,
]);

function normalize(str) {
	return String(str || '')
		.toLowerCase()
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '');
}

function localizedName(obj, lang) {
	return (obj.name_localizations && obj.name_localizations[lang]) || obj.name;
}

function localizedDesc(obj, lang) {
	return (obj.description_localizations && obj.description_localizations[lang])
		|| obj.description
		|| '';
}

function matchesName(obj, query, lang) {
	const n = normalize(query);
	if (normalize(obj.name) === n) return true;
	const loc = obj.name_localizations?.[lang];
	return Boolean(loc && normalize(loc) === n);
}

/**
 * Resolve a subcommand (or group+sub) path against slash options.
 * @returns {{ target: object|null, pathNames: string[] }}
 */
function resolveSubcommand(options, subPath, lang) {
	if (!subPath.length) return { target: null, pathNames: [] };

	if (subPath.length === 1) {
		const target = (options || []).find(
			(o) => o.type === ApplicationCommandOptionType.Subcommand && matchesName(o, subPath[0], lang),
		);
		return {
			target: target || null,
			pathNames: target ? [localizedName(target, lang)] : [],
		};
	}

	if (subPath.length === 2) {
		const group = (options || []).find(
			(o) => o.type === ApplicationCommandOptionType.SubcommandGroup && matchesName(o, subPath[0], lang),
		);
		if (!group?.options) return { target: null, pathNames: [] };
		const target = group.options.find(
			(o) => o.type === ApplicationCommandOptionType.Subcommand && matchesName(o, subPath[1], lang),
		);
		return {
			target: target || null,
			pathNames: target
				? [localizedName(group, lang), localizedName(target, lang)]
				: [],
		};
	}

	return { target: null, pathNames: [] };
}

function formatParamLine(param, lang, translations, { allCommands } = {}) {
	const requiredSuffix = param.required
		? translations.translate('HELP_PARAM_REQUIRED_SUFFIX')
		: '';
	const paramName = localizedName(param, lang);
	let paramDesc = localizedDesc(param, lang);

	if (allCommands && param.name === 'command') {
		paramDesc += ` ${translations.translate('HELP_PARAM_HELP_COMMAND_VALUES', {
			commands: '`' + allCommands.join('`, `') + '`',
		})}`;
	}

	const extras = [];

	if (Array.isArray(param.choices) && param.choices.length > 0) {
		const choiceParts = param.choices.map((c) => {
			const label = (c.name_localizations && c.name_localizations[lang]) || c.name;
			return `${label} (\`${c.value}\`)`;
		});
		extras.push(translations.translate('HELP_PARAM_CHOICES', { choices: choiceParts.join(', ') }));
	}

	if (param.autocomplete) {
		extras.push(translations.translate('HELP_PARAM_AUTOCOMPLETE'));
	}

	if (param.min_length != null || param.max_length != null) {
		const min = param.min_length != null ? param.min_length : '…';
		const max = param.max_length != null ? param.max_length : '…';
		extras.push(translations.translate('HELP_PARAM_LENGTH', { min, max }));
	}

	if (param.type === ApplicationCommandOptionType.Boolean) {
		extras.push(translations.translate('HELP_PARAM_BOOLEAN'));
	}

	if (extras.length) {
		paramDesc += ` — ${extras.join(' · ')}`;
	}

	return `• \`${paramName}\`${requiredSuffix} – ${paramDesc}`;
}

function formatUsageToken(param, lang, translations) {
	const name = localizedName(param, lang);
	let inner;
	if (Array.isArray(param.choices) && param.choices.length > 0) {
		const vals = param.choices.map((c) => {
			const label = (c.name_localizations && c.name_localizations[lang]) || c.name;
			return label;
		});
		inner = `${name}:<${vals.join('|')}>`;
	}
	else if (param.autocomplete) {
		inner = `${name}:<…>`;
	}
	else if (param.type === ApplicationCommandOptionType.Boolean) {
		inner = `${name}:<${translations.translate('HELP_PARAM_BOOLEAN')}>`;
	}
	else {
		inner = `${name}:<…>`;
	}
	return param.required ? inner : `[${inner}]`;
}

function formatUsageLine(baseDisplayName, pathNames, params, lang, translations) {
	const parts = [`/${baseDisplayName}`, ...pathNames];
	const tokens = (params || []).map((p) => formatUsageToken(p, lang, translations));
	return '`' + [...parts, ...tokens].join(' ') + '`';
}

function paramHint(params, lang) {
	if (!params?.length) return '';
	const bits = params.map((p) => {
		const n = localizedName(p, lang);
		return p.required ? `\`${n}\`*` : `\`${n}\``;
	});
	return ` (${bits.join(', ')})`;
}

function listCommandNames(slashCommands, lang) {
	return slashCommands.map((cmd) => {
		const json = cmd.data.toJSON();
		return localizedName(json, lang);
	});
}

function resolveSlashCommand(slashCommands, baseName, lang) {
	const command = slashCommands.get(baseName);
	if (command) return command;

	const normalizedBase = normalize(baseName);
	for (const candidate of slashCommands.values()) {
		const json = candidate.data.toJSON();
		if (normalize(json.name) === normalizedBase) {
			return candidate;
		}
		const locName = json.name_localizations?.[lang];
		if (locName && normalize(locName) === normalizedBase) {
			return candidate;
		}
	}
	return null;
}

function applyNotFound(helpEmbed, translations, rawName, slashCommands, lang) {
	const names = listCommandNames(slashCommands, lang);
	helpEmbed
		.setDescription(
			[
				translations.translate('HELP_COMMAND_NOT_FOUND', {
					command: safeEscapeMarkdown(rawName),
				}),
				translations.translate('HELP_NOT_FOUND_HINT', {
					commands: '`' + names.join('`, `') + '`',
				}),
			].join('\n'),
		)
		.setColor(0xFF0000);
}

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
				})
				.setAutocomplete(true),
		),

	async execute(interaction) {
		const guildId = interaction.guild?.id;
		const translations = new Translate(interaction.client, guildId);
		let currentLang = interaction.client.traductions.get(guildId);
		if (!interaction.client.languages.has(currentLang)) currentLang = 'en';

		const helpEmbed = new EmbedBuilder().setColor(getRandomColor());
		const rawName = interaction.options.getString('command');
		const slashCommands = interaction.client.slashCommands;

		if (!rawName) {
			const lines = slashCommands
				.map((command) => {
					const json = command.data.toJSON();
					const name = localizedName(json, currentLang);
					const desc = localizedDesc(json, currentLang);
					return `• \`/${name}\` – ${desc}`;
				})
				.sort((a, b) => a.localeCompare(b));

			helpEmbed
				.setTitle(translations.translate('HELP_TITLE_LIST'))
				.setDescription(
					[
						lines.join('\n'),
						'',
						translations.translate('HELP_LIST_HINT'),
					].join('\n'),
				);

			await interaction.reply({ embeds: [helpEmbed], flags: 64 });
			return;
		}

		const name = rawName.toLowerCase().trim();
		const parts = name.split(/\s+/);
		let baseName = parts[0];
		if (baseName.startsWith('/')) {
			baseName = baseName.slice(1);
		}
		const subPath = parts.slice(1);

		helpEmbed.setTitle(
			translations.translate('HELP_TITLE_COMMAND', { command: safeEscapeMarkdown(rawName) }),
		);

		const command = resolveSlashCommand(slashCommands, baseName, currentLang);

		if (!command) {
			applyNotFound(helpEmbed, translations, rawName, slashCommands, currentLang);
			await interaction.reply({ embeds: [helpEmbed], flags: 64 });
			return;
		}

		const data = command.data.toJSON();
		const baseDisplayName = localizedName(data, currentLang);
		const options = data.options ?? [];

		if (subPath.length > 0) {
			const { target: targetSub, pathNames } = resolveSubcommand(options, subPath, currentLang);

			if (!targetSub) {
				applyNotFound(helpEmbed, translations, rawName, slashCommands, currentLang);
				await interaction.reply({ embeds: [helpEmbed], flags: 64 });
				return;
			}

			const params = targetSub.options ?? [];
			helpEmbed.setDescription(localizedDesc(targetSub, currentLang));

			if (params.length > 0 || pathNames.length > 0) {
				helpEmbed.addFields({
					name: translations.translate('HELP_SECTION_USAGE'),
					value: formatUsageLine(baseDisplayName, pathNames, params, currentLang, translations),
				});
			}

			if (params.length > 0) {
				const lines = params.map((p) => formatParamLine(p, currentLang, translations));
				helpEmbed.addFields({
					name: translations.translate('HELP_SECTION_PARAMETERS'),
					value: lines.join('\n'),
				});
			}

			await interaction.reply({ embeds: [helpEmbed], flags: 64 });
			return;
		}

		const localizedDescription = localizedDesc(data, currentLang);
		helpEmbed.setDescription(localizedDescription || '—');

		const subcommands = options.filter((o) => SUB_TYPES.has(o.type));
		const params = options.filter((o) => !SUB_TYPES.has(o.type));

		if (subcommands.length > 0) {
			const lines = [];
			for (const opt of subcommands) {
				if (opt.type === ApplicationCommandOptionType.Subcommand) {
					const subDisplayName = localizedName(opt, currentLang);
					const subDesc = localizedDesc(opt, currentLang);
					lines.push(
						`• \`/${baseDisplayName} ${subDisplayName}\` – ${subDesc}${paramHint(opt.options, currentLang)}`,
					);
				}
				else if (
					opt.type === ApplicationCommandOptionType.SubcommandGroup
					&& Array.isArray(opt.options)
				) {
					const groupName = localizedName(opt, currentLang);
					for (const sub of opt.options) {
						if (sub.type !== ApplicationCommandOptionType.Subcommand) continue;
						const subDisplayName = localizedName(sub, currentLang);
						const subDesc = localizedDesc(sub, currentLang);
						lines.push(
							`• \`/${baseDisplayName} ${groupName} ${subDisplayName}\` – ${subDesc}${paramHint(sub.options, currentLang)}`,
						);
					}
				}
			}

			helpEmbed.addFields({
				name: translations.translate('HELP_SECTION_SUBCOMMANDS'),
				value: lines.length > 0
					? lines.join('\n')
					: translations.translate('HELP_NO_SUBCOMMANDS'),
			});
		}

		if (params.length > 0) {
			const allCommands = data.name === 'help'
				? listCommandNames(slashCommands, currentLang)
				: null;

			helpEmbed.addFields({
				name: translations.translate('HELP_SECTION_USAGE'),
				value: formatUsageLine(baseDisplayName, [], params, currentLang, translations),
			});

			const lines = params.map((p) => formatParamLine(p, currentLang, translations, { allCommands }));
			helpEmbed.addFields({
				name: translations.translate('HELP_SECTION_PARAMETERS'),
				value: lines.join('\n'),
			});
		}

		helpEmbed.setFooter({ text: translations.translate('HELP_LIST_HINT') });

		await interaction.reply({ embeds: [helpEmbed], flags: 64 });
	},
};
