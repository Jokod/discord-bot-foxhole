const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const Translate = require('../../../utils/translations.js');
const { getRandomColor } = require('../../../utils/colors.js');

const STEAM_PLAYERS_URL = 'https://api.steampowered.com/ISteamUserStats/GetNumberOfCurrentPlayers/v1/?appid=505460';
const FOXHOLE_WAR_URL = 'https://war-service-live.foxholeservices.com/api/worldconquest/war';
const FETCH_TIMEOUT_MS = 8000;

async function fetchWithTimeout(url) {
	const controller = new AbortController();
	const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
	try {
		const res = await fetch(url, { signal: controller.signal });
		clearTimeout(timeoutId);
		if (!res.ok) return null;
		return await res.json();
	}
	catch {
		clearTimeout(timeoutId);
		return null;
	}
}

module.exports = {
	data: new SlashCommandBuilder()
		.setName('foxhole')
		.setNameLocalizations({
			fr: 'foxhole',
			ru: 'фоксхол',
			'zh-CN': 'foxhole',
		})
		.setDescription('Current Foxhole players and war status.')
		.setDescriptionLocalizations({
			fr: 'Joueurs actuels et statut de la guerre Foxhole.',
			ru: 'Текущие игроки и статус войны Foxhole.',
			'zh-CN': '当前 Foxhole 玩家数与战争状态。',
		})
		.addSubcommand((subcommand) =>
			subcommand
				.setName('info')
				.setNameLocalizations({
					fr: 'info',
					ru: 'инфо',
					'zh-CN': '信息',
				})
				.setDescription('Players online and current war stats.')
				.setDescriptionLocalizations({
					fr: 'Joueurs en ligne et statistiques de la guerre en cours.',
					ru: 'Игроки в сети и статистика текущей войны.',
					'zh-CN': '在线玩家数与当前战争统计。',
				}),
		),

	async execute(interaction) {
		const guildId = interaction.guild?.id;
		const translations = new Translate(interaction.client, guildId);

		await interaction.deferReply({ flags: 64 });

		const [steamData, warData] = await Promise.all([
			fetchWithTimeout(STEAM_PLAYERS_URL),
			fetchWithTimeout(FOXHOLE_WAR_URL),
		]);

		const embed = new EmbedBuilder()
			.setColor(getRandomColor())
			.setTitle(translations.translate('FOXHOLE_TITLE'));

		// Steam player count
		const playerCount = steamData?.response?.player_count;
		if (typeof playerCount === 'number') {
			embed.addFields({
				name: translations.translate('FOXHOLE_PLAYERS_CURRENT'),
				value: playerCount.toLocaleString(),
				inline: true,
			});
		}
		else {
			embed.addFields({
				name: translations.translate('FOXHOLE_PLAYERS_CURRENT'),
				value: translations.translate('FOXHOLE_UNAVAILABLE'),
				inline: true,
			});
		}

		// War stats
		if (warData && typeof warData.warNumber === 'number') {
			const winnerKeys = { NONE: 'FOXHOLE_WINNER_NONE', WARDEN: 'FOXHOLE_WINNER_WARDEN', COLONIAL: 'FOXHOLE_WINNER_COLONIAL' };
			const winnerKey = winnerKeys[warData.winner] || 'FOXHOLE_WINNER_NONE';
			const winnerLabel = translations.translate(winnerKey);

			const startTime = warData.conquestStartTime
				? `<t:${Math.floor(warData.conquestStartTime / 1000)}:F>`
				: '—';

			embed.addFields(
				{
					name: translations.translate('FOXHOLE_WAR_NUMBER'),
					value: String(warData.warNumber),
					inline: true,
				},
				{
					name: translations.translate('FOXHOLE_WAR_WINNER'),
					value: winnerLabel,
					inline: true,
				},
				{
					name: translations.translate('FOXHOLE_WAR_REQUIRED_TOWNS'),
					value: String(warData.requiredVictoryTowns ?? '—'),
					inline: true,
				},
				{
					name: translations.translate('FOXHOLE_WAR_START'),
					value: startTime,
					inline: false,
				},
			);
		}
		else {
			embed.addFields({
				name: translations.translate('FOXHOLE_WAR_TITLE'),
				value: translations.translate('FOXHOLE_UNAVAILABLE'),
				inline: false,
			});
		}

		const noData = typeof playerCount !== 'number' && (!warData || typeof warData.warNumber !== 'number');
		if (noData) {
			embed.setDescription(translations.translate('FOXHOLE_ALL_UNAVAILABLE'));
		}

		await interaction.editReply({ embeds: [embed] });
	},
};
