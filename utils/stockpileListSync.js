const { Stockpile, TrackedMessage } = require('../data/models.js');
const Translate = require('./translations.js');
const { buildStockpileListEmbed, buildStockpileListComponents } = require('../interactions/embeds/stockpileList.js');

/**
 * Réattribue des ids uniques aux stockpiles en doublon (même server_id + id).
 * Conserve l'id du plus ancien document (createdAt).
 * @param {string} guildId
 * @returns {Promise<number>} Nombre de documents corrigés
 */
async function repairDuplicateStockpileIds(guildId) {
	const stocks = await Stockpile.find({ server_id: guildId }).sort({ createdAt: 1 }).lean();
	if (stocks.length === 0) return 0;

	const seenIds = new Set();
	let maxId = stocks.reduce((max, s) => Math.max(max, parseInt(s.id, 10) || 0), 0);
	let repaired = 0;

	for (const stock of stocks) {
		if (!seenIds.has(stock.id)) {
			seenIds.add(stock.id);
			continue;
		}

		maxId += 1;
		await Stockpile.updateOne({ _id: stock._id }, { $set: { id: String(maxId) } });
		repaired += 1;
	}

	return repaired;
}

/**
 * Met à jour un message de liste stockpile tracké (embed + boutons à jour).
 * @param {import('discord.js').Client} client
 * @param {{ server_id: string, channel_id: string, message_id: string }} tracked
 * @returns {Promise<boolean>}
 */
async function refreshTrackedStockpileList(client, tracked) {
	try {
		const channel = await client.channels.fetch(tracked.channel_id).catch(() => null);
		if (!channel?.isTextBased?.()) return false;

		const msg = await channel.messages.fetch(tracked.message_id).catch(() => null);
		if (!msg) return false;

		const translations = new Translate(client, tracked.server_id);
		const { embed, isEmpty } = await buildStockpileListEmbed(Stockpile, tracked.server_id, translations);

		if (isEmpty) {
			await msg.edit({
				content: translations.translate('STOCKPILE_LIST_EMPTY'),
				embeds: [],
				components: [],
			});
		}
		else {
			const components = await buildStockpileListComponents(Stockpile, tracked.server_id, translations);
			await msg.edit({ content: '', embeds: [embed], components });
		}

		return true;
	}
	catch {
		return false;
	}
}

/**
 * Rafraîchit les listes stockpile trackées pour un ou plusieurs serveurs.
 * @param {import('discord.js').Client} client
 * @param {{ guildIds?: string[] }} [options]
 * @returns {Promise<number>} Nombre de messages mis à jour
 */
async function refreshTrackedStockpileLists(client, { guildIds } = {}) {
	const filter = { message_type: 'stockpile_list' };
	if (guildIds?.length) {
		filter.server_id = { $in: guildIds };
	}

	const trackedLists = await TrackedMessage.find(filter).lean();
	let refreshed = 0;

	for (const tracked of trackedLists) {
		if (await refreshTrackedStockpileList(client, tracked)) {
			refreshed += 1;
		}
	}

	return refreshed;
}

/**
 * Répare les ids dupliqués puis rafraîchit toutes les listes trackées des serveurs actifs.
 * Appelé au démarrage pour migrer les boutons legacy et corriger les données incohérentes.
 * @param {import('discord.js').Client} client
 */
async function syncAllStockpileLists(client) {
	const guildIds = Array.from(client.guilds.cache.keys());
	if (guildIds.length === 0) return;

	let repaired = 0;
	for (const guildId of guildIds) {
		repaired += await repairDuplicateStockpileIds(guildId);
	}

	const refreshed = await refreshTrackedStockpileLists(client, { guildIds });

	if (repaired > 0 || refreshed > 0) {
		console.log(`[StockpileList] ${repaired} id(s) corrigé(s), ${refreshed} liste(s) rafraîchie(s).`);
	}
}

module.exports = {
	repairDuplicateStockpileIds,
	refreshTrackedStockpileList,
	refreshTrackedStockpileLists,
	syncAllStockpileLists,
};
