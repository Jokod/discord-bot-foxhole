const {
	EmbedBuilder,
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
	StringSelectMenuBuilder,
	StringSelectMenuOptionBuilder,
} = require('discord.js');
const { getRandomColor } = require('../../utils/colors.js');
const { formatForDisplay } = require('../../utils/formatLocation.js');
const { safeEscapeMarkdown } = require('../../utils/markdown.js');
const { STOCKPILE_MAX_ACTIVE } = require('../../utils/constants.js');

/**
 * Construit l'embed de la liste des stockpiles pour un serveur.
 * Supprime les stocks expirés avant de construire la liste.
 * @param {import('mongoose').Model} Stockpile - Modèle Stockpile
 * @param {string} guildId - ID du serveur
 * @param {Translate} translations - Instance des traductions
 * @returns {Promise<{ embed: EmbedBuilder | null, isEmpty: boolean, stocks: object[] }>}
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

/** Discord limite les labels de bouton à 80 caractères. */
const DISCORD_MAX_BUTTON_LABEL_LENGTH = 80;

/**
 * @param {Array<{ id: string, _id: unknown, name?: string }>} stocks
 * @returns {Map<string, number>}
 */
function countStockIds(stocks) {
	const counts = new Map();
	for (const stock of stocks) {
		counts.set(stock.id, (counts.get(stock.id) || 0) + 1);
	}
	return counts;
}

/**
 * @param {{ id: string, _id: unknown, name?: string }} stock
 * @param {Map<string, number>} idCounts
 */
function buildStockpileButtonLabel(stock, idCounts) {
	const base = `#${stock.id}`;
	if ((idCounts.get(stock.id) || 0) <= 1) {
		return base.slice(0, DISCORD_MAX_BUTTON_LABEL_LENGTH);
	}

	const namePart = (stock.name || '').trim().slice(0, 12);
	const disambiguated = namePart
		? `${base} ${namePart}`
		: `${base}…${String(stock._id).slice(-4)}`;

	return disambiguated.slice(0, DISCORD_MAX_BUTTON_LABEL_LENGTH);
}

/**
 * Stocks actifs uniques, triés par id numérique.
 * @param {import('mongoose').Model} Stockpile
 * @param {string} guildId
 */
async function loadUniqueActiveStocks(Stockpile, guildId) {
	const stocks = await Stockpile.find({ server_id: guildId, deleted: false }).lean();
	const seen = new Set();
	return (stocks || [])
		.filter((stock) => {
			const ref = String(stock._id);
			if (seen.has(ref)) return false;
			seen.add(ref);
			return true;
		})
		.sort((a, b) => Number(a.id) - Number(b.id));
}

/**
 * Composants de la liste publique : boutons de reset uniquement.
 * @param {import('mongoose').Model} Stockpile
 * @param {string} guildId
 * @param {{ translate: (key: string, vars?: object) => string }} [translations]
 * @returns {Promise<import('discord.js').ActionRowBuilder[]>}
 */
async function buildStockpileListComponents(Stockpile, guildId, translations) {
	void translations;
	const uniqueStocks = await loadUniqueActiveStocks(Stockpile, guildId);
	const rows = [];

	if (uniqueStocks.length === 0) {
		return rows;
	}

	const idCounts = countStockIds(uniqueStocks);
	const buttons = uniqueStocks.slice(0, STOCKPILE_MAX_ACTIVE).map((stock) =>
		new ButtonBuilder()
			.setCustomId(`stockpile_reset-${stock._id}`)
			.setLabel(buildStockpileButtonLabel(stock, idCounts))
			.setStyle(ButtonStyle.Primary),
	);

	for (let i = 0; i < buttons.length; i += 5) {
		rows.push(new ActionRowBuilder().addComponents(...buttons.slice(i, i + 5)));
	}

	return rows;
}

/**
 * Composants du panneau `/stockpile manage` : select remove + cleanup / delete all.
 * @param {import('mongoose').Model} Stockpile
 * @param {string} guildId
 * @param {{ translate: (key: string, vars?: object) => string }} [translations]
 * @returns {Promise<import('discord.js').ActionRowBuilder[]>}
 */
async function buildStockpileManageComponents(Stockpile, guildId, translations) {
	const uniqueStocks = await loadUniqueActiveStocks(Stockpile, guildId);
	const rows = [];
	const t = (key) => (translations?.translate ? translations.translate(key) : key);

	if (uniqueStocks.length > 0) {
		const idCounts = countStockIds(uniqueStocks);
		const removeOptions = uniqueStocks.slice(0, 25).map((stock) =>
			new StringSelectMenuOptionBuilder()
				.setLabel(buildStockpileButtonLabel(stock, idCounts).slice(0, 100))
				.setDescription(String(stock.name || '').slice(0, 100) || `#${stock.id}`)
				.setValue(String(stock._id)),
		);

		rows.push(
			new ActionRowBuilder().addComponents(
				new StringSelectMenuBuilder()
					.setCustomId('select_stockpile_remove')
					.setPlaceholder(t('STOCKPILE_REMOVE_PLACEHOLDER').slice(0, 150))
					.addOptions(removeOptions),
			),
		);
	}

	rows.push(
		new ActionRowBuilder().addComponents(
			new ButtonBuilder()
				.setCustomId('stockpile_cleanup')
				.setLabel(t('STOCKPILE_BTN_CLEANUP').slice(0, DISCORD_MAX_BUTTON_LABEL_LENGTH))
				.setStyle(ButtonStyle.Secondary),
			new ButtonBuilder()
				.setCustomId('stockpile_deleteall')
				.setLabel(t('STOCKPILE_BTN_DELETEALL').slice(0, DISCORD_MAX_BUTTON_LABEL_LENGTH))
				.setStyle(ButtonStyle.Danger),
		),
	);

	return rows;
}

/**
 * Payload du panneau manage (embed + composants admin).
 * @param {import('mongoose').Model} Stockpile
 * @param {string} guildId
 * @param {{ translate: (key: string, vars?: object) => string }} translations
 */
async function buildStockpileManagePayload(Stockpile, guildId, translations) {
	const { embed, isEmpty } = await buildStockpileListEmbed(Stockpile, guildId, translations);
	const components = await buildStockpileManageComponents(Stockpile, guildId, translations);

	if (isEmpty) {
		return {
			content: translations.translate('STOCKPILE_LIST_EMPTY'),
			embeds: [],
			components,
		};
	}

	return {
		content: '',
		embeds: [embed],
		components,
	};
}

module.exports = {
	buildStockpileListEmbed,
	buildStockpileListComponents,
	buildStockpileManageComponents,
	buildStockpileManagePayload,
	buildStockpileButtonLabel,
	countStockIds,
};
