const { Stockpile, TrackedMessage } = require('../../../data/models.js');
const Translate = require('../../../utils/translations.js');
const { editTrackedOrFallback } = require('../../../utils/trackedMessage.js');
const { normalizeForDb, formatForDisplay } = require('../../../utils/formatLocation.js');
const { buildStockpileListPayload } = require('../../embeds/stockpileList.js');
const { sendToSubscribers } = require('../../../utils/notifications.js');
const { STOCKPILE_MAX_ACTIVE, STOCKPILE_RESET_DURATION_MS } = require('../../../utils/constants.js');
const { safeEscapeMarkdown } = require('../../../utils/markdown.js');
const {
	v2Text,
	isComponentsV2Message,
	sendV2,
	isDisplayUpdateFailedError,
} = require('../../../utils/componentsV2.js');

module.exports = {
	id: 'modal_stockpile_add',

	async execute(interaction) {
		const { client, guild, channelId, user, fields } = interaction;
		const translations = new Translate(client, guild?.id);
		if (!guild) {
			return interaction.reply(v2Text(translations.translate('NO_DM'), { ephemeral: true }));
		}

		const validateRegionOrCity = (value) => /^[\p{L}\p{N}_ -]{1,50}$/u.test((value || '').trim());
		const validateName = (name) => /^[\p{L}\p{N}_ ]{3,50}$/u.test(name);
		const validatePassword = (password) => /^\d{6}$/.test(password);

		const regionRaw = (fields.getTextInputValue('stock_region') || '').trim();
		const cityRaw = (fields.getTextInputValue('stock_city') || '').trim();
		const name = (fields.getTextInputValue('stock_name') || '').trim();
		const rawCode = (fields.getTextInputValue('stock_code') || '').trim();
		const password = rawCode.replace(/\D/g, '');

		const errors = [];
		if (!validateRegionOrCity(regionRaw)) errors.push(translations.translate('STOCKPILE_INVALID_REGION'));
		if (!validateRegionOrCity(cityRaw)) errors.push(translations.translate('STOCKPILE_INVALID_CITY'));
		if (!validateName(name)) errors.push(translations.translate('STOCKPILE_INVALID_NAME'));
		if (!validatePassword(password)) errors.push(translations.translate('STOCKPILE_INVALID_PASSWORD'));

		if (errors.length > 0) {
			return await interaction.reply(v2Text(errors.join('\n'), { ephemeral: true }));
		}

		try {
			const activeCount = await Stockpile.countDocuments({ server_id: guild.id, deleted: false });
			if (activeCount >= STOCKPILE_MAX_ACTIVE) {
				return await interaction.reply(v2Text(
					translations.translate('STOCKPILE_MAX_REACHED', { max: STOCKPILE_MAX_ACTIVE }),
					{ ephemeral: true },
				));
			}

			const allIds = await Stockpile.find({ server_id: guild.id }, { id: 1, _id: 0 }).lean();
			const maxId = allIds.reduce((max, s) => Math.max(max, parseInt(s.id, 10) || 0), 0);
			const nextId = (maxId + 1).toString();
			const region = normalizeForDb(regionRaw);
			const city = normalizeForDb(cityRaw);
			const now = new Date();
			const expiresAt = new Date(now.getTime() + STOCKPILE_RESET_DURATION_MS);

			const created = await Stockpile.create({
				id: nextId,
				server_id: guild.id,
				name,
				password,
				region,
				city,
				channel_id: channelId,
				owner_id: user.id,
				lastResetAt: now,
				expiresAt,
			});

			const payload = await buildStockpileListPayload(Stockpile, guild.id, translations);
			const MESSAGE_TYPE = 'stockpile_list';
			const expectedListTitle = `🔑 ${translations.translate('STOCKPILE_LIST_CODES')}`;
			const fallbackMatcher = (msgs) =>
				msgs.find((m) => {
					if (m.author?.id !== client.user.id) return false;
					if (m.embeds?.[0]?.title === expectedListTitle) return true;
					if (isComponentsV2Message(m)) {
						const raw = JSON.stringify(m.components ?? []);
						return raw.includes(expectedListTitle);
					}
					return false;
				}) ?? null;

			try {
				await editTrackedOrFallback({
					channel: interaction.channel,
					serverId: guild.id,
					messageType: MESSAGE_TYPE,
					model: TrackedMessage,
					fallbackMatcher,
					editPayload: payload,
					fallbackSend: () => sendV2(interaction.channel, payload),
				});
			}
			catch (err) {
				if (isDisplayUpdateFailedError(err)) {
					await Stockpile.deleteOne({ _id: created._id }).catch(() => undefined);
					return await interaction.reply(v2Text(
						translations.translate('DISPLAY_UPDATE_FAILED'),
						{ ephemeral: true },
					));
				}
				throw err;
			}

			await interaction.reply(v2Text(
				translations.translate('STOCKPILE_CREATE_SUCCESS', { id: nextId }),
				{ ephemeral: true },
			));
			sendToSubscribers(client, guild.id, 'stockpile_activity', (t) => v2Text(
				t.translate('NOTIFICATION_STOCKPILE_ADDED', {
					user: `<@${user.id}>`,
					name: safeEscapeMarkdown(name),
					id: nextId,
					region: safeEscapeMarkdown(formatForDisplay(region)),
					city: safeEscapeMarkdown(formatForDisplay(city)),
				}),
			)).catch(() => undefined);
		}
		catch (err) {
			console.error(err);
			const payload = v2Text(translations.translate('STOCKPILE_CREATE_ERROR'), { ephemeral: true });
			if (interaction.replied || interaction.deferred) {
				await interaction.followUp(payload).catch(console.error);
			}
			else {
				await interaction.reply(payload).catch(console.error);
			}
		}
	},
};
