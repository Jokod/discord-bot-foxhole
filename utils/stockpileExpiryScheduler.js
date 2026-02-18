const { Stockpile, NotificationSubscription, TrackedMessage } = require('../data/models.js');
const Translate = require('./translations.js');
const { buildStockpileListEmbed, buildStockpileListComponents } = require('../interactions/embeds/stockpileList.js');
const { formatForDisplay } = require('./formatLocation.js');
const { safeEscapeMarkdown } = require('./markdown.js');

/** Run every 5 minutes. */
const CHECK_INTERVAL_MS = 5 * 60 * 1000;

/** Reminder thresholds: minutes before expiration. Send when minutesLeft <= threshold and not yet in expiry_reminders_sent. */
const REMINDER_WINDOWS = [
	{ label: '12h', minutes: 12 * 60 },
	{ label: '6h', minutes: 6 * 60 },
	{ label: '3h', minutes: 3 * 60 },
	{ label: '2h', minutes: 2 * 60 },
	{ label: '1h', minutes: 1 * 60 },
	{ label: '30m', minutes: 30 },
];

/**
 * Find stockpiles that are in a reminder window this run, send one message per subscribed channel,
 * then mark those reminders as sent.
 * @param {import('discord.js').Client} client
 */
async function checkExpiringStockpiles(client) {
	if (process.env.APP_ENV === 'dev') {
		console.log('[stockpileExpiryScheduler] check ran at', new Date().toISOString());
	}

	const now = new Date();
	const nowMs = now.getTime();

	const allStocks = await Stockpile.find({
		deleted: false,
		expiresAt: { $gt: now },
	}).lean();

	if (allStocks.length === 0) return;

	// For each stock, send only the closest due reminder: smallest interval for which minutesLeft <= threshold and not yet in expiry_reminders_sent.
	const toNotify = [];
	const windowsAsc = [...REMINDER_WINDOWS].sort((a, b) => a.minutes - b.minutes);
	for (const s of allStocks) {
		const expiresAt = s.expiresAt instanceof Date ? s.expiresAt : new Date(s.expiresAt);
		const minutesLeft = (expiresAt.getTime() - nowMs) / (60 * 1000);
		if (minutesLeft <= 0) continue;
		const remindersSent = s.expiry_reminders_sent || [];
		for (const window of windowsAsc) {
			if (minutesLeft <= window.minutes && !remindersSent.includes(window.label)) {
				toNotify.push({ stock: s, window: window.label });
				break;
			}
		}
	}

	if (toNotify.length === 0) return;

	if (process.env.APP_ENV === 'dev') {
		console.log('[stockpileExpiryScheduler] sending', toNotify.length, 'reminder(s) at', new Date().toISOString());
	}

	// Group by guild_id for subscriptions
	const byGuild = new Map();
	for (const { stock, window } of toNotify) {
		const key = stock.server_id;
		if (!byGuild.has(key)) byGuild.set(key, []);
		byGuild.get(key).push({ stock, window });
	}

	const subscriptions = await NotificationSubscription.find({
		notification_type: 'stockpile_expiring',
		guild_id: { $in: Array.from(byGuild.keys()) },
	}).lean();

	if (process.env.APP_ENV === 'dev') {
		const subscribedGuilds = new Set(subscriptions.map((s) => s.guild_id));
		for (const gid of byGuild.keys()) {
			if (!subscribedGuilds.has(gid)) {
				console.log('[stockpileExpiryScheduler] no channel subscribed for stockpile_expiring in guild', gid);
			}
		}
	}

	for (const sub of subscriptions) {
		const items = byGuild.get(sub.guild_id);
		if (!items || items.length === 0) continue;

		const translations = new Translate(client, sub.guild_id);
		const title = translations.translate('NOTIFICATION_STOCKPILE_EXPIRING_ALERT');
		const windowLabelKey = {
			'12h': 'NOTIFICATION_EXPIRING_IN_12H',
			'6h': 'NOTIFICATION_EXPIRING_IN_6H',
			'3h': 'NOTIFICATION_EXPIRING_IN_3H',
			'2h': 'NOTIFICATION_EXPIRING_IN_2H',
			'1h': 'NOTIFICATION_EXPIRING_IN_1H',
			'30m': 'NOTIFICATION_EXPIRING_IN_30M',
		};
		const lines = items.map(({ stock: s, window }) => {
			const region = safeEscapeMarkdown(formatForDisplay(s.region || ''));
			const city = safeEscapeMarkdown(formatForDisplay(s.city || ''));
			const windowLabel = windowLabelKey[window] ? translations.translate(windowLabelKey[window]) : window;
			const creator = s.owner_id && s.owner_id !== '0' ? `<@${s.owner_id}> ` : '';
			return translations.translate('NOTIFICATION_STOCKPILE_EXPIRING_LINE', {
				creator,
				id: s.id,
				name: safeEscapeMarkdown(s.name),
				region,
				city,
				window: windowLabel,
			});
		});
		const content = `${title}\n${lines.join('\n')}`;

		try {
			const channel = await client.channels.fetch(sub.channel_id).catch(() => null);
			if (channel?.isSendable()) {
				await channel.send({ content });
			}
		}
		catch {
			// Skip on error
		}
	}

	// Mettre à jour les messages de liste des stocks pour chaque serveur concerné
	const guildIds = Array.from(byGuild.keys());
	const trackedLists = await TrackedMessage.find({
		server_id: { $in: guildIds },
		message_type: 'stockpile_list',
	}).lean();

	for (const tracked of trackedLists) {
		try {
			const channel = await client.channels.fetch(tracked.channel_id).catch(() => null);
			if (!channel?.isTextBased?.()) continue;

			const translations = new Translate(client, tracked.server_id);
			const { embed, isEmpty } = await buildStockpileListEmbed(Stockpile, tracked.server_id, translations);

			if (isEmpty) {
				const msg = await channel.messages.fetch(tracked.message_id).catch(() => null);
				if (msg) {
					await msg.edit({
						content: translations.translate('STOCKPILE_LIST_EMPTY'),
						embeds: [],
						components: [],
					});
				}
			}
			else {
				const components = await buildStockpileListComponents(Stockpile, tracked.server_id);
				const msg = await channel.messages.fetch(tracked.message_id).catch(() => null);
				if (msg) {
					await msg.edit({ embeds: [embed], components });
				}
			}
		}
		catch {
			// Skip on error (message supprimé, permissions, etc.)
		}
	}

	// Mark all due intervals as sent (not just the one we notified), so we don't send 12h/6h/3h/2h/1h on next run.
	const toUpdate = new Map();
	for (const { stock } of toNotify) {
		const id = stock._id.toString();
		if (toUpdate.has(id)) continue;
		const expiresAt = stock.expiresAt instanceof Date ? stock.expiresAt : new Date(stock.expiresAt);
		const minutesLeft = (expiresAt.getTime() - nowMs) / (60 * 1000);
		const remindersSent = stock.expiry_reminders_sent || [];
		const allDueLabels = windowsAsc
			.filter((w) => minutesLeft <= w.minutes && !remindersSent.includes(w.label))
			.map((w) => w.label);
		if (allDueLabels.length > 0) {
			toUpdate.set(id, allDueLabels);
		}
	}
	for (const [stockId, windows] of toUpdate) {
		await Stockpile.findByIdAndUpdate(stockId, { $addToSet: { expiry_reminders_sent: { $each: windows } } });
	}
}

/**
 * Start the expiring stockpile check interval. Call once when the client is ready.
 * Timers are .unref()'d so they do not keep the process alive (avoids Jest / test leaks).
 * @param {import('discord.js').Client} client
 */
function start(client) {
	console.log('Stockpile expiry reminders: running at', new Date().toISOString(), '(check every 5 min, reminders at 12h, 6h, 3h, 2h, 1h, 30min).');

	const timeoutId = setTimeout(() => {
		checkExpiringStockpiles(client).catch((err) => console.error('[stockpileExpiryScheduler]', new Date().toISOString(), err));
	}, 60 * 1000);
	timeoutId.unref();

	const intervalId = setInterval(() => {
		checkExpiringStockpiles(client).catch((err) => console.error('[stockpileExpiryScheduler]', new Date().toISOString(), err));
	}, CHECK_INTERVAL_MS);
	intervalId.unref();
}

module.exports = { start, checkExpiringStockpiles };
