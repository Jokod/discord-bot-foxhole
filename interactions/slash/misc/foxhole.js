const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const Translate = require('../../../utils/translations.js');
const { getRandomColor } = require('../../../utils/colors.js');

const STEAM_PLAYERS_URL = 'https://api.steampowered.com/ISteamUserStats/GetNumberOfCurrentPlayers/v1/?appid=505460';
const FOXHOLE_WAR_URL = 'https://war-service-live.foxholeservices.com/api/worldconquest/war';
const FETCH_TIMEOUT_MS = 8000;

// Simple in-memory cache to avoid hitting external APIs too often
const foxholeCache = {
	steam: { data: null, ts: 0 },
	war: { data: null, ts: 0 },
};

// Foxhole War API data updates every ~60s; Steam players is also poll-based
const STEAM_TTL = 60_000;
const WAR_TTL = 60_000;

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

async function getSteamData() {
	const now = Date.now();
	if (foxholeCache.steam.data && now - foxholeCache.steam.ts < STEAM_TTL) {
		return foxholeCache.steam.data;
	}

	const data = await fetchWithTimeout(STEAM_PLAYERS_URL);
	if (data) {
		foxholeCache.steam = { data, ts: now };
	}

	return data;
}

async function getWarData() {
	const now = Date.now();
	if (foxholeCache.war.data && now - foxholeCache.war.ts < WAR_TTL) {
		return foxholeCache.war.data;
	}

	const data = await fetchWithTimeout(FOXHOLE_WAR_URL);
	if (data) {
		foxholeCache.war = { data, ts: now };
	}

	return data;
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
		)
		.addSubcommand((subcommand) =>
			subcommand
				.setName('map')
				.setNameLocalizations({
					fr: 'carte',
					ru: 'карта',
					'zh-CN': '地图',
				})
				.setDescription('Get the Foxhole live map & stats website.')
				.setDescriptionLocalizations({
					fr: 'Obtenir le site de carte & statistiques Foxhole (foxholestats.com).',
					ru: 'Ссылка на сайт карты и статистики Foxhole (foxholestats.com).',
					'zh-CN': '获取 Foxhole 地图与统计网站 (foxholestats.com)。',
				}),
		),

	async execute(interaction) {
		const guildId = interaction.guild?.id;
		const translations = new Translate(interaction.client, guildId);

		const subcommand = interaction.options.getSubcommand();

		// Simple link to the community stats website (ephemeral)
		if (subcommand === 'map') {
			return interaction.reply({
				content: 'https://foxholestats.com/',
				flags: 64,
			});
		}

		await interaction.deferReply({ flags: 64 });

		const [steamData, warData] = await Promise.all([
			getSteamData(),
			getWarData(),
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
