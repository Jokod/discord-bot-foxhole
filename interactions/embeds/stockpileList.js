const {
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
	StringSelectMenuBuilder,
	StringSelectMenuOptionBuilder,
} = require('discord.js');
const { formatForDisplay } = require('../../utils/formatLocation.js');
const { safeEscapeMarkdown } = require('../../utils/markdown.js');
const { STOCKPILE_MAX_ACTIVE } = require('../../utils/constants.js');
const { buildV2Payload, v2Text, joinBlocks } = require('../../utils/componentsV2.js');

/** Stable accent for stockpile list (no urgency). */
const STOCKPILE_ACCENT = 0xF1C40F;
const STOCKPILE_ACCENT_WARN = 0xE67E22;
const STOCKPILE_ACCENT_CRITICAL = 0xE74C3C;
const ONE_HOUR_MS = 60 * 60 * 1000;
const SIX_HOURS_MS = 6 * ONE_HOUR_MS;

/** Discord limite les labels de bouton à 80 caractères. */
const DISCORD_MAX_BUTTON_LABEL_LENGTH = 80;

/**
 * Accent by soonest active expiry: red ≤1h, orange ≤6h, else yellow.
 * @param {Array<{ deleted?: boolean, expiresAt?: Date|string }>} stocks
 * @param {number} [nowMs]
 */
function accentForStockpiles(stocks, nowMs) {
	const now = nowMs == null ? Date.now() : nowMs;
	let accent = STOCKPILE_ACCENT;
	for (const s of stocks || []) {
		if (s.deleted) continue;
		const expiresAt = s.expiresAt instanceof Date ? s.expiresAt : new Date(s.expiresAt);
		if (Number.isNaN(expiresAt.getTime())) continue;
		const left = expiresAt.getTime() - now;
		if (left <= ONE_HOUR_MS) return STOCKPILE_ACCENT_CRITICAL;
		if (left <= SIX_HOURS_MS) accent = STOCKPILE_ACCENT_WARN;
	}
	return accent;
}

/**
 * Construit le texte de la liste des stockpiles pour un serveur.
 * Supprime les stocks expirés avant de construire la liste.
 * @param {import('mongoose').Model} Stockpile - Modèle Stockpile
 * @param {string} guildId - ID du serveur
 * @param {Translate} translations - Instance des traductions
 * @returns {Promise<{ body: string | null, children: Array|null, isEmpty: boolean, stocks: object[], accentColor: number }>}
 */
async function buildStockpileListDisplay(Stockpile, guildId, translations) {
	await Stockpile.deleteMany({
		server_id: guildId,
		expiresAt: { $lte: new Date() },
	});

	const allStocks = await Stockpile.find({ server_id: guildId });
	const sortedById = allStocks.slice().sort((a, b) => Number(a.id) - Number(b.id));
	const accentColor = accentForStockpiles(sortedById);

	if (sortedById.length === 0) {
		return {
			body: null,
			children: null,
			isEmpty: true,
			stocks: [],
			accentColor,
		};
	}

	const parts = buildStockpileTextParts(sortedById, translations);
	const body = [parts.titleText, parts.bodyText, parts.footerText].filter(Boolean).join('\n\n');

	return {
		body,
		children: parts.children,
		isEmpty: false,
		stocks: sortedById,
		accentColor,
	};
}

/**
 * Urgency prefix for a stockpile row.
 * @param {{ deleted?: boolean, expiresAt?: Date|string }} stock
 * @param {number} nowMs
 */
function urgencyPrefix(stock, nowMs) {
	if (stock.deleted) return '';
	const expiresAt = stock.expiresAt instanceof Date ? stock.expiresAt : new Date(stock.expiresAt);
	if (Number.isNaN(expiresAt.getTime())) return '';
	const left = expiresAt.getTime() - nowMs;
	if (left <= ONE_HOUR_MS) return '🔴 ';
	if (left <= SIX_HOURS_MS) return '🟠 ';
	return '';
}

/**
 * Build stockpile list text parts for an arbitrary stock array.
 * Layout: title+footer → region blocks (separated).
 * @param {Array} stocks
 * @param {{ translate: Function }} translations
 * @param {number} [nowMs]
 * @returns {{ titleText: string, bodyText: string, footerText: string, children: Array }}
 */
function buildStockpileTextParts(stocks, translations, nowMs) {
	const now = nowMs == null ? Date.now() : nowMs;
	const sortedById = (stocks || []).slice().sort((a, b) => Number(a.id) - Number(b.id));
	if (!sortedById.length) {
		const empty = translations.translate('STOCKPILE_LIST_EMPTY');
		return {
			titleText: empty,
			bodyText: '',
			footerText: '',
			children: [empty],
		};
	}

	const byRegion = new Map();
	for (const s of sortedById) {
		if (!byRegion.has(s.region)) byRegion.set(s.region, new Map());
		const byCity = byRegion.get(s.region);
		if (!byCity.has(s.city)) byCity.set(s.city, []);
		byCity.get(s.city).push(s);
	}

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

	/** @type {string[]} */
	const regionBlocks = [];
	/** @type {Map<string, string[]>} */
	const linesByRegion = new Map();

	for (const { region, city } of blockOrder) {
		if (!linesByRegion.has(region)) linesByRegion.set(region, []);
		const regionLines = linesByRegion.get(region);
		if (regionLines.length === 0) {
			regionLines.push(`### 📍 ${safeEscapeMarkdown(formatForDisplay(region))}`);
		}
		regionLines.push(`**🏭 ${safeEscapeMarkdown(formatForDisplay(city))}**`);
		const list = byRegion.get(region).get(city);
		for (const s of list) {
			const expiresAt = s.expiresAt instanceof Date ? s.expiresAt : new Date(s.expiresAt);
			const expiresTs = Math.floor(expiresAt.getTime() / 1000);
			const creator = s.owner_id ? `<@${s.owner_id}>` : translations.translate('NONE');
			const idDisplay = s.deleted ? `#${s.id} ❌` : `#${s.id}`;
			const urg = urgencyPrefix(s, now);
			const row = `${urg}${idDisplay} · **${safeEscapeMarkdown(s.name)}**\n\`${safeEscapeMarkdown(s.password)}\` · <t:${expiresTs}:R> · ${creator}`;
			regionLines.push(s.deleted ? `~~${row}~~` : row);
		}
		regionLines.push('');
	}

	for (const lines of linesByRegion.values()) {
		regionBlocks.push(lines.join('\n').trimEnd());
	}

	const title = `🔑 ${translations.translate('STOCKPILE_LIST_CODES')}`;
	const activeCount = sortedById.filter((s) => !s.deleted).length;
	const footer = translations.translate('STOCKPILE_LIST_FOOTER', {
		active: activeCount,
		total: sortedById.length,
	});
	const titleText = `### ${title}`;
	const footerText = `*${footer}*`;
	const bodyText = regionBlocks.join('\n\n');
	const children = joinBlocks(
		[[titleText, footerText], ...regionBlocks],
		{ break: 'large' },
	);
	return {
		titleText,
		bodyText,
		footerText,
		children,
	};
}

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
	const namePart = (stock.name || '').trim();
	let label = namePart
		? `#${stock.id} · ${namePart}`
		: `#${stock.id}`;

	if ((idCounts.get(stock.id) || 0) > 1) {
		const shortName = namePart.slice(0, 12);
		label = shortName
			? `#${stock.id} · ${shortName}`
			: `#${stock.id}…${String(stock._id).slice(-4)}`;
	}

	return label.slice(0, DISCORD_MAX_BUTTON_LABEL_LENGTH);
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
 * Payload V2 de la liste publique.
 * @param {import('mongoose').Model} Stockpile
 * @param {string} guildId
 * @param {{ translate: (key: string, vars?: object) => string }} translations
 */
async function buildStockpileListPayload(Stockpile, guildId, translations) {
	const { children, isEmpty, accentColor } = await buildStockpileListDisplay(Stockpile, guildId, translations);
	if (isEmpty) {
		return v2Text(translations.translate('STOCKPILE_LIST_EMPTY'), { accentColor });
	}
	const actionRows = await buildStockpileListComponents(Stockpile, guildId, translations);
	return buildV2Payload({
		children,
		actionRows,
		accentColor,
	});
}

/**
 * Payload V2 du panneau manage.
 * @param {import('mongoose').Model} Stockpile
 * @param {string} guildId
 * @param {{ translate: (key: string, vars?: object) => string }} translations
 * @param {{ ephemeral?: boolean }} [opts]
 */
async function buildStockpileManagePayload(Stockpile, guildId, translations, { ephemeral = true } = {}) {
	const { children, isEmpty, accentColor } = await buildStockpileListDisplay(Stockpile, guildId, translations);
	const components = await buildStockpileManageComponents(Stockpile, guildId, translations);

	if (isEmpty) {
		return buildV2Payload({
			children: [translations.translate('STOCKPILE_LIST_EMPTY')],
			actionRows: components,
			accentColor,
			ephemeral,
		});
	}

	return buildV2Payload({
		children,
		actionRows: components,
		accentColor,
		ephemeral,
	});
}

module.exports = {
	STOCKPILE_ACCENT,
	STOCKPILE_ACCENT_WARN,
	STOCKPILE_ACCENT_CRITICAL,
	accentForStockpiles,
	buildStockpileListDisplay,
	buildStockpileTextParts,
	buildStockpileListPayload,
	buildStockpileListComponents,
	buildStockpileManageComponents,
	buildStockpileManagePayload,
	buildStockpileButtonLabel,
	countStockIds,
};
