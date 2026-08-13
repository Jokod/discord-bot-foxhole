const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const Translate = require('../../../utils/translations.js');
const { getRandomColor } = require('../../../utils/colors.js');
const { discordTs, formatElapsed } = require('../../../utils/discord.js');
const {
	getMaps,
	getSteamPlayers,
	getWarReport,
	getWarStatusSummary,
} = require('../../../utils/foxholeWarApi.js');

const FOXHOLE_STATS_URL = 'https://foxholestats.com/';

module.exports = {
	data: new SlashCommandBuilder()
		.setName('war')
		.setNameLocalizations({
			'es-ES': 'guerra',
			fr: 'guerre',
			ru: 'война',
			'zh-CN': '战争',
		})
		.setDescription('Foxhole war information (War API).')
		.setDescriptionLocalizations({
			'es-ES': 'Información sobre la guerra de Foxhole (War API).',
			fr: 'Informations sur la guerre Foxhole (War API).',
			ru: 'Информация о войне Foxhole (War API).',
			'zh-CN': 'Foxhole 战争信息（War API）。',
		})
		.addSubcommand((sub) =>
			sub
				.setName('status')
				.setNameLocalizations({
					'es-ES': 'estado',
					fr: 'statut',
					ru: 'статус',
					'zh-CN': '状态',
				})
				.setDescription('Show current war status and players online.')
				.setDescriptionLocalizations({
					'es-ES': 'Mostrar el estado de la guerra y los jugadores en línea.',
					fr: 'Afficher le statut de la guerre et les joueurs en ligne.',
					ru: 'Показать статус войны и игроков онлайн.',
					'zh-CN': '显示当前战争状态与在线玩家。',
				}),
		)
		.addSubcommand((sub) =>
			sub
				.setName('maps')
				.setNameLocalizations({
					'es-ES': 'mapas',
					fr: 'cartes',
					ru: 'карты',
					'zh-CN': '地图列表',
				})
				.setDescription('List active World Conquest maps and live stats link.')
				.setDescriptionLocalizations({
					'es-ES': 'Listar los mapas World Conquest y el enlace foxholestats.com.',
					fr: 'Lister les cartes World Conquest et le lien foxholestats.com.',
					ru: 'Список карт World Conquest и ссылка foxholestats.com.',
					'zh-CN': '列出 World Conquest 地图及 foxholestats.com 链接。',
				}),
		)
		.addSubcommand((sub) =>
			sub
				.setName('report')
				.setNameLocalizations({
					'es-ES': 'informe',
					fr: 'rapport',
					ru: 'отчет',
					'zh-CN': '报告',
				})
				.setDescription('Show war report for a specific map.')
				.setDescriptionLocalizations({
					'es-ES': 'Mostrar el informe de guerra de un mapa.',
					fr: 'Afficher le rapport de guerre pour une carte.',
					ru: 'Показать отчёт по карте.',
					'zh-CN': '显示指定地图的战争报告。',
				})
				.addStringOption((opt) =>
					opt
						.setName('map')
						.setNameLocalizations({
							'es-ES': 'mapa',
							fr: 'carte',
							ru: 'карта',
							'zh-CN': '地图',
						})
						.setDescription('Exact War API map name (e.g. DeadLandsHex).')
						.setDescriptionLocalizations({
							'es-ES': 'Nombre exacto del mapa War API (ej: DeadLandsHex).',
							fr: 'Nom exact de la carte War API (ex: DeadLandsHex).',
							ru: 'Точное имя карты War API (например, DeadLandsHex).',
							'zh-CN': 'War API 地图名称（例如 DeadLandsHex）。',
						})
						.setRequired(true),
				),
		),

	async execute(interaction) {
		const guildId = interaction.guild?.id;
		const translations = new Translate(interaction.client, guildId);
		const sub = interaction.options.getSubcommand();

		await interaction.deferReply({ flags: 64 });

		if (sub === 'status') {
			const summary = await getWarStatusSummary();

			if (!summary.available) {
				const steamData = await getSteamPlayers();
				const playerCount = steamData?.response?.player_count;
				if (typeof playerCount !== 'number') {
					return interaction.editReply({
						content: translations.translate('FOXHOLE_ALL_UNAVAILABLE'),
					});
				}
				const embed = new EmbedBuilder()
					.setColor(getRandomColor())
					.setTitle(translations.translate('FOXHOLE_TITLE'))
					.addFields(
						{
							name: translations.translate('FOXHOLE_PLAYERS_CURRENT'),
							value: playerCount.toLocaleString(),
							inline: true,
						},
						{
							name: translations.translate('FOXHOLE_WAR_TITLE'),
							value: translations.translate('FOXHOLE_UNAVAILABLE'),
							inline: false,
						},
					);
				return interaction.editReply({ embeds: [embed] });
			}

			let winnerKey = 'FOXHOLE_WINNER_NONE';
			if (summary.winner === 'WARDEN') winnerKey = 'FOXHOLE_WINNER_WARDEN';
			else if (summary.winner === 'COLONIAL') winnerKey = 'FOXHOLE_WINNER_COLONIAL';
			else if (summary.ended) winnerKey = 'FOXHOLE_WINNER_ENDED';
			const need = summary.effectiveRequiredVictoryTowns ?? summary.requiredVictoryTowns;
			const vt = summary.victoryTowns;

			const embed = new EmbedBuilder()
				.setColor(summary.ended ? 0x6b4f2f : getRandomColor())
				.setTitle(translations.translate(
					summary.ended ? 'FOXHOLE_WAR_TITLE_ENDED' : 'FOXHOLE_TITLE',
				));

			embed.addFields({
				name: translations.translate('FOXHOLE_PLAYERS_CURRENT'),
				value: summary.playersOnline != null
					? Number(summary.playersOnline).toLocaleString()
					: translations.translate('FOXHOLE_UNAVAILABLE'),
				inline: true,
			});

			embed.addFields(
				{
					name: translations.translate('FOXHOLE_WAR_NUMBER'),
					value: String(summary.warNumber),
					inline: true,
				},
				{
					name: translations.translate('FOXHOLE_WAR_WINNER'),
					value: translations.translate(winnerKey),
					inline: true,
				},
			);

			if (summary.dayOfWar != null) {
				embed.addFields({
					name: translations.translate('FOXHOLE_WAR_DAY'),
					value: translations.translate('FOXHOLE_WAR_DAY_VALUE', { n: summary.dayOfWar }),
					inline: true,
				});
			}
			if (summary.elapsed?.days != null) {
				embed.addFields({
					name: translations.translate('FOXHOLE_WAR_ELAPSED'),
					value: formatElapsed(summary.elapsed, translations, 'FOXHOLE_WAR_ELAPSED_VALUE'),
					inline: true,
				});
			}

			if (vt) {
				embed.addFields(
					{
						name: translations.translate('FOXHOLE_WAR_COLONIAL_TOWNS'),
						value: need != null ? `${vt.colonial} / ${need}` : String(vt.colonial),
						inline: true,
					},
					{
						name: translations.translate('FOXHOLE_WAR_WARDEN_TOWNS'),
						value: need != null ? `${vt.warden} / ${need}` : String(vt.warden),
						inline: true,
					},
				);
				if (vt.scorched) {
					embed.addFields({
						name: translations.translate('FOXHOLE_WAR_SCORCHED_TOWNS'),
						value: String(vt.scorched),
						inline: true,
					});
				}
			}
			else if (summary.requiredVictoryTowns != null) {
				embed.addFields({
					name: translations.translate('FOXHOLE_WAR_REQUIRED_TOWNS'),
					value: String(summary.requiredVictoryTowns),
					inline: true,
				});
			}

			if (summary.shortRequiredVictoryTowns != null) {
				embed.addFields({
					name: translations.translate('FOXHOLE_WAR_SHORT_REQUIRED_TOWNS'),
					value: String(summary.shortRequiredVictoryTowns),
					inline: true,
				});
			}

			embed.addFields({
				name: translations.translate('FOXHOLE_WAR_START'),
				value: discordTs(summary.conquestStartTime),
				inline: false,
			});

			if (summary.ended && summary.conquestEndTime) {
				embed.addFields({
					name: translations.translate('FOXHOLE_WAR_END'),
					value: discordTs(summary.conquestEndTime),
					inline: false,
				});
			}
			else if (!summary.ended && summary.scheduledConquestEndTime) {
				embed.addFields({
					name: translations.translate('FOXHOLE_WAR_SCHEDULED_END'),
					value: `${discordTs(summary.scheduledConquestEndTime)} (${discordTs(summary.scheduledConquestEndTime, 'R')})`,
					inline: false,
				});
			}
			else if (summary.conquestEndTime) {
				embed.addFields({
					name: translations.translate('FOXHOLE_WAR_END'),
					value: discordTs(summary.conquestEndTime),
					inline: false,
				});
			}

			return interaction.editReply({ embeds: [embed] });
		}

		if (sub === 'maps') {
			const maps = await getMaps();

			if (!Array.isArray(maps) || maps.length === 0) {
				return interaction.editReply({
					content: translations.translate('FOXHOLE_MAPS_UNAVAILABLE'),
				});
			}

			const embed = new EmbedBuilder()
				.setColor(getRandomColor())
				.setTitle(translations.translate('FOXHOLE_MAPS_TITLE'))
				.setDescription(`${maps.join('\n')}\n\n${FOXHOLE_STATS_URL}`);

			return interaction.editReply({ embeds: [embed] });
		}

		if (sub === 'report') {
			const mapName = interaction.options.getString('map');
			const report = await getWarReport(mapName);

			if (!report || typeof report.totalEnlistments !== 'number') {
				return interaction.editReply({
					content: translations.translate('FOXHOLE_REPORT_UNAVAILABLE', { map: mapName }),
				});
			}

			const embed = new EmbedBuilder()
				.setColor(getRandomColor())
				.setTitle(translations.translate('FOXHOLE_REPORT_TITLE', { map: mapName }))
				.addFields(
					{ name: translations.translate('FOXHOLE_REPORT_ENLISTMENTS'), value: String(report.totalEnlistments), inline: true },
					{ name: translations.translate('FOXHOLE_REPORT_COLONIAL_CASUALTIES'), value: String(report.colonialCasualties ?? 0), inline: true },
					{ name: translations.translate('FOXHOLE_REPORT_WARDEN_CASUALTIES'), value: String(report.wardenCasualties ?? 0), inline: true },
					{ name: translations.translate('FOXHOLE_REPORT_DAY'), value: String(report.dayOfWar ?? '—'), inline: true },
				);

			return interaction.editReply({ embeds: [embed] });
		}

		return interaction.editReply({
			content: translations.translate('COMMAND_UNKNOWN'),
		});
	},
};
