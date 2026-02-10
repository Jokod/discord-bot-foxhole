const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const Translate = require('../../../utils/translations.js');
const { getRandomColor } = require('../../../utils/colors.js');

const WARAPI_ROOT = 'https://war-service-live.foxholeservices.com/api';
const WARAPI_WAR_URL = `${WARAPI_ROOT}/worldconquest/war`;
const WARAPI_MAPS_URL = `${WARAPI_ROOT}/worldconquest/maps`;
const FETCH_TIMEOUT_MS = 8000;

// Simple in-memory cache with ETag + expiry
const warCache = {
	war: { data: null, etag: null, expiresAt: 0 },
	maps: { data: null, etag: null, expiresAt: 0 },
	// mapName -> { data, etag, expiresAt }
	reports: new Map(),
};

// Fallback TTLs when Cache-Control is absent or unparsable
const TTL = {
	// 60s – war state updates at most every 60s
	war: 60_000,
	// 10min – map list is very stable
	maps: 10 * 60_000,
	// 5s – per-map war report is fairly dynamic
	report: 5_000,
};

function parseMaxAge(cacheControl) {
	if (!cacheControl) return null;
	const match = cacheControl.match(/max-age=(\d+)/);
	if (!match) return null;
	const seconds = Number(match[1]);
	return Number.isFinite(seconds) ? seconds * 1000 : null;
}

async function fetchWithTimeout(url, options = {}) {
	const controller = new AbortController();
	const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
	try {
		const res = await fetch(url, { ...options, signal: controller.signal });
		clearTimeout(timeoutId);
		return res;
	}
	catch {
		clearTimeout(timeoutId);
		return null;
	}
}

async function getWar() {
	const now = Date.now();
	// Local expiry check to avoid unnecessary HTTP calls
	if (warCache.war.data && now < warCache.war.expiresAt) {
		return warCache.war.data;
	}

	const headers = {};
	if (warCache.war.etag) headers['If-None-Match'] = warCache.war.etag;

	const res = await fetchWithTimeout(WARAPI_WAR_URL, { headers });
	if (!res) return warCache.war.data;

	// 304 Not Modified -> keep cached data, refresh expiry
	if (res.status === 304 && warCache.war.data) {
		const cc = res.headers.get('cache-control');
		const maxAgeMs = parseMaxAge(cc) ?? TTL.war;
		warCache.war.expiresAt = now + maxAgeMs;
		return warCache.war.data;
	}

	if (!res.ok) return warCache.war.data;

	const data = await res.json().catch(() => null);
	if (!data) return warCache.war.data;

	const cc = res.headers.get('cache-control');
	const etag = res.headers.get('etag');
	const maxAgeMs = parseMaxAge(cc) ?? TTL.war;

	warCache.war = {
		data,
		etag: etag || warCache.war.etag,
		expiresAt: now + maxAgeMs,
	};

	return data;
}

async function getMaps() {
	const now = Date.now();
	if (warCache.maps.data && now < warCache.maps.expiresAt) {
		return warCache.maps.data;
	}

	const headers = {};
	if (warCache.maps.etag) headers['If-None-Match'] = warCache.maps.etag;

	const res = await fetchWithTimeout(WARAPI_MAPS_URL, { headers });
	if (!res) return warCache.maps.data;

	if (res.status === 304 && warCache.maps.data) {
		const cc = res.headers.get('cache-control');
		const maxAgeMs = parseMaxAge(cc) ?? TTL.maps;
		warCache.maps.expiresAt = now + maxAgeMs;
		return warCache.maps.data;
	}

	if (!res.ok) return warCache.maps.data;

	const data = await res.json().catch(() => null);
	if (!data) return warCache.maps.data;

	const cc = res.headers.get('cache-control');
	const etag = res.headers.get('etag');
	const maxAgeMs = parseMaxAge(cc) ?? TTL.maps;

	warCache.maps = {
		data,
		etag: etag || warCache.maps.etag,
		expiresAt: now + maxAgeMs,
	};

	return data;
}

async function getWarReport(mapName) {
	const key = mapName.toLowerCase();
	const now = Date.now();
	const cached = warCache.reports.get(key) || { data: null, etag: null, expiresAt: 0 };

	if (cached.data && now < cached.expiresAt) {
		return cached.data;
	}

	const headers = {};
	if (cached.etag) headers['If-None-Match'] = cached.etag;

	const url = `${WARAPI_ROOT}/worldconquest/warReport/${encodeURIComponent(mapName)}`;
	const res = await fetchWithTimeout(url, { headers });
	if (!res) return cached.data;

	if (res.status === 304 && cached.data) {
		const cc = res.headers.get('cache-control');
		const maxAgeMs = parseMaxAge(cc) ?? TTL.report;
		cached.expiresAt = now + maxAgeMs;
		warCache.reports.set(key, cached);
		return cached.data;
	}

	if (!res.ok) return cached.data;

	const data = await res.json().catch(() => null);
	if (!data) return cached.data;

	const cc = res.headers.get('cache-control');
	const etag = res.headers.get('etag');
	const maxAgeMs = parseMaxAge(cc) ?? TTL.report;

	const updated = {
		data,
		etag: etag || cached.etag,
		expiresAt: now + maxAgeMs,
	};
	warCache.reports.set(key, updated);

	return data;
}

module.exports = {
	data: new SlashCommandBuilder()
		.setName('war')
		.setNameLocalizations({
			fr: 'guerre',
			ru: 'война',
			'zh-CN': '战争',
		})
		.setDescription('Foxhole war information (War API).')
		.setDescriptionLocalizations({
			fr: 'Informations sur la guerre Foxhole (War API).',
			ru: 'Информация о войне Foxhole (War API).',
			'zh-CN': 'Foxhole 战争信息（War API）。',
		})
		.addSubcommand((sub) =>
			sub
				.setName('status')
				.setNameLocalizations({
					fr: 'statut',
					ru: 'статус',
					'zh-CN': '状态',
				})
				.setDescription('Show current war status.'),
		)
		.addSubcommand((sub) =>
			sub
				.setName('maps')
				.setNameLocalizations({
					fr: 'cartes',
					ru: 'карты',
					'zh-CN': '地图',
				})
				.setDescription('List active World Conquest maps.'),
		)
		.addSubcommand((sub) =>
			sub
				.setName('report')
				.setNameLocalizations({
					fr: 'rapport',
					ru: 'отчет',
					'zh-CN': '报告',
				})
				.setDescription('Show war report for a specific map.')
				.addStringOption((opt) =>
					opt
						.setName('map')
						.setNameLocalizations({
							fr: 'carte',
							ru: 'карта',
							'zh-CN': '地图',
						})
						.setDescription('Exact War API map name (e.g. DeadLandsHex).')
						.setDescriptionLocalizations({
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
			const warData = await getWar();

			if (!warData || typeof warData.warNumber !== 'number') {
				return interaction.editReply({
					content: 'War API is currently unavailable. Please try again later.',
				});
			}

			const winner = warData.winner || 'NONE';
			const startTime = warData.conquestStartTime
				? `<t:${Math.floor(warData.conquestStartTime / 1000)}:F>`
				: '—';
			const endTime = warData.conquestEndTime
				? `<t:${Math.floor(warData.conquestEndTime / 1000)}:F>`
				: '—';

			const embed = new EmbedBuilder()
				.setColor(getRandomColor())
				.setTitle('Foxhole War – Status')
				.addFields(
					{ name: 'War #', value: String(warData.warNumber), inline: true },
					{ name: 'Winner', value: winner, inline: true },
					{ name: 'Required victory towns', value: String(warData.requiredVictoryTowns ?? '—'), inline: true },
					{ name: 'Short required towns', value: String(warData.shortRequiredVictoryTowns ?? '0'), inline: true },
					{ name: 'Conquest start', value: startTime, inline: false },
					{ name: 'Conquest end', value: endTime, inline: false },
				);

			return interaction.editReply({ embeds: [embed] });
		}

		if (sub === 'maps') {
			const maps = await getMaps();

			if (!Array.isArray(maps) || maps.length === 0) {
				return interaction.editReply({
					content: 'War API (maps endpoint) is unavailable or returned no maps.',
				});
			}

			const embed = new EmbedBuilder()
				.setColor(getRandomColor())
				.setTitle('Foxhole War – Maps')
				.setDescription(maps.join('\n'));

			return interaction.editReply({ embeds: [embed] });
		}

		if (sub === 'report') {
			const mapName = interaction.options.getString('map');
			const report = await getWarReport(mapName);

			if (!report || typeof report.totalEnlistments !== 'number') {
				return interaction.editReply({
					content: `No war report data for map \`${mapName}\` (or War API is unavailable).`,
				});
			}

			const embed = new EmbedBuilder()
				.setColor(getRandomColor())
				.setTitle(`War report – ${mapName}`)
				.addFields(
					{ name: 'Total enlistments', value: String(report.totalEnlistments), inline: true },
					{ name: 'Colonial casualties', value: String(report.colonialCasualties ?? 0), inline: true },
					{ name: 'Warden casualties', value: String(report.wardenCasualties ?? 0), inline: true },
					{ name: 'Day of war', value: String(report.dayOfWar ?? '—'), inline: true },
				);

			return interaction.editReply({ embeds: [embed] });
		}

		return interaction.editReply({
			content: translations.translate('COMMAND_UNKNOWN'),
		});
	},
};

