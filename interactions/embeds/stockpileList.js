const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { getRandomColor } = require('../../utils/colors.js');
const { DISCORD_MAX_BUTTONS_PER_MESSAGE } = require('../../utils/constants.js');
const { formatForDisplay } = require('../../utils/formatLocation.js');
const { safeEscapeMarkdown } = require('../../utils/markdown.js');

/**
 * Construit l'embed de la liste des stockpiles pour un serveur.
 * Supprime les stocks expirés avant de construire la liste.
 * @param {import('mongoose').Model} Stockpile - Modèle Stockpile
 * @param {string} guildId - ID du serveur
 * @param {Translate} translations - Instance des traductions
 * @returns {Promise<{ embed: EmbedBuilder | null, isEmpty: boolean }>}
 */
async function buildStockpileListEmbed(Stockpile, guildId, translations) {
	await Stockpile.deleteMany({
		server_id: guildId,
		expiresAt: { $lte: new Date() },
	});

	const allStocks = await Stockpile.find({ server_id: guildId });
	const sortedStocks = allStocks.sort((a, b) => {
		if (a.region !== b.region) return a.region.localeCompare(b.region);
		if (a.city !== b.city) return a.city.localeCompare(b.city);
		return Number(a.id) - Number(b.id);
	});

	if (sortedStocks.length === 0) {
		return { embed: null, isEmpty: true, stocks: [] };
	}

	const byRegion = new Map();
	for (const s of sortedStocks) {
		if (!byRegion.has(s.region)) byRegion.set(s.region, new Map());
		const byCity = byRegion.get(s.region);
		if (!byCity.has(s.city)) byCity.set(s.city, []);
		byCity.get(s.city).push(s);
	}

	const headerStock = translations.translate('STOCKPILE_TABLE_HEADER_STOCK');
	const headerCode = translations.translate('STOCKPILE_TABLE_HEADER_CODE');
	const headerDate = translations.translate('STOCKPILE_TABLE_HEADER_EXPIRES');
	const sep = '  |  ';
	const lines = [];
	let firstRegion = true;
	for (const [region, byCity] of byRegion) {
		if (!firstRegion) lines.push('');
		firstRegion = false;
		lines.push(`📍 **${safeEscapeMarkdown(formatForDisplay(region))}**`);
		for (const [city, list] of byCity) {
			lines.push(`🏭 **${safeEscapeMarkdown(formatForDisplay(city))}**`);
			lines.push(`**${headerStock}**${sep}**${headerCode}**${sep}**${headerDate}**`);
			for (const s of list) {
				const expiresAt = s.expiresAt instanceof Date ? s.expiresAt : new Date(s.expiresAt);
				const expiresTs = Math.floor(expiresAt.getTime() / 1000);
				const creator = s.owner_id ? `<@${s.owner_id}>` : translations.translate('NONE');
				const idDisplay = s.deleted ? `${s.id} ❌` : s.id;
				const row = `${idDisplay} • **${safeEscapeMarkdown(s.name)}**${sep}\`${safeEscapeMarkdown(s.password)}\`${sep}<t:${expiresTs}:R> • ${creator}`;
				lines.push(s.deleted ? `~~${row}~~` : row);
			}
			lines.push('');
		}
	}

	const embed = new EmbedBuilder()
		.setColor(getRandomColor())
		.setTitle(`🔑 ${translations.translate('STOCKPILE_LIST_CODES')}`)
		.setDescription(lines.join('\n'));

	return { embed, isEmpty: false, stocks: sortedStocks };
}

/**
 * Construit les boutons de reset pour la liste des stockpiles d'un serveur.
 * @param {import('mongoose').Model} Stockpile - Modèle Stockpile
 * @param {string} guildId - ID du serveur
 * @returns {Promise<import('discord.js').ActionRowBuilder[]>}
 */
async function buildStockpileListComponents(Stockpile, guildId) {
	const stocks = await Stockpile.find({ server_id: guildId, deleted: false }).sort({ id: 1 }).lean();
	if (!stocks || stocks.length === 0) return [];

	const buttons = stocks.slice(0, DISCORD_MAX_BUTTONS_PER_MESSAGE).map((stock) =>
		new ButtonBuilder()
			.setCustomId(`stockpile_reset-${stock.id}`)
			.setLabel(`#${stock.id}`)
			.setStyle(ButtonStyle.Primary),
	);

	const rows = [];
	for (let i = 0; i < buttons.length; i += 5) {
		rows.push(new ActionRowBuilder().addComponents(...buttons.slice(i, i + 5)));
	}
	return rows;
}

module.exports = { buildStockpileListEmbed, buildStockpileListComponents };
