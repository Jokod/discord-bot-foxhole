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
	const sortedById = allStocks.slice().sort((a, b) => Number(a.id) - Number(b.id));

	if (sortedById.length === 0) {
		return { embed: null, isEmpty: true, stocks: [] };
	}

	// Grouper par région puis ville ; chaque liste est déjà triée par id (ordre de sortedById)
	const byRegion = new Map();
	for (const s of sortedById) {
		if (!byRegion.has(s.region)) byRegion.set(s.region, new Map());
		const byCity = byRegion.get(s.region);
		if (!byCity.has(s.city)) byCity.set(s.city, []);
		byCity.get(s.city).push(s);
	}

	// Afficher les blocs (region, city) dans l’ordre du plus petit id (ordre de première apparition dans sortedById)
	const seenBlocks = new Map();
	const blockOrder = [];
	for (const s of sortedById) {
		const key = `${s.region}\0${s.city}`;
		if (!seenBlocks.has(key)) {
			seenBlocks.set(key, Number(s.id));
			blockOrder.push({ region: s.region, city: s.city });
		}
	}
	blockOrder.sort((a, b) => seenBlocks.get(`${a.region}\0${a.city}`) - seenBlocks.get(`${b.region}\0${b.city}`));

	const headerStock = translations.translate('STOCKPILE_TABLE_HEADER_STOCK');
	const headerCode = translations.translate('STOCKPILE_TABLE_HEADER_CODE');
	const headerDate = translations.translate('STOCKPILE_TABLE_HEADER_EXPIRES');
	const sep = '  |  ';
	const lines = [];
	let lastRegion = null;
	for (const { region, city } of blockOrder) {
		if (lastRegion !== region) {
			if (lastRegion !== null) lines.push('');
			lines.push(`📍 **${safeEscapeMarkdown(formatForDisplay(region))}**`);
			lastRegion = region;
		}
		lines.push(`🏭 **${safeEscapeMarkdown(formatForDisplay(city))}**`);
		lines.push(`**${headerStock}**${sep}**${headerCode}**${sep}**${headerDate}**`);
		const list = byRegion.get(region).get(city);
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

	const embed = new EmbedBuilder()
		.setColor(getRandomColor())
		.setTitle(`🔑 ${translations.translate('STOCKPILE_LIST_CODES')}`)
		.setDescription(lines.join('\n'));

	return { embed, isEmpty: false, stocks: sortedById };
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
