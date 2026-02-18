const { Stockpile, TrackedMessage } = require('../../../data/models.js');
const Translate = require('../../../utils/translations.js');
const { editTrackedOrFallback } = require('../../../utils/trackedMessage.js');
const { normalizeForDb, formatForDisplay } = require('../../../utils/formatLocation.js');
const { buildStockpileListEmbed } = require('../../embeds/stockpileList.js');
const { sendToSubscribers } = require('../../../utils/notifications.js');
const { DISCORD_MAX_BUTTONS_PER_MESSAGE, STOCKPILE_RESET_DURATION_MS } = require('../../../utils/constants.js');
const { safeEscapeMarkdown } = require('../../../utils/markdown.js');

module.exports = {
	id: 'modal_stockpile_add',

	async execute(interaction) {
		const { client, guild, channelId, user, fields } = interaction;
		const translations = new Translate(client, guild?.id);
		if (!guild) {
			return interaction.reply({
				content: translations.translate('NO_DM'),
				flags: 64,
			});
		}

		// Lettres (y compris accentuées), chiffres, espaces, tirets, underscores
		const validateRegionOrCity = (value) => /^[\p{L}\p{N}_ -]{1,50}$/u.test((value || '').trim());
		// Lettres (y compris accentuées), chiffres, espaces, underscores (3-50 caractères)
		const validateName = (name) => /^[\p{L}\p{N}_ ]{3,50}$/u.test(name);
		const validatePassword = (password) => /^\d{6}$/.test(password);

		const regionRaw = (fields.getTextInputValue('stock_region') || '').trim();
		const cityRaw = (fields.getTextInputValue('stock_city') || '').trim();
		const name = (fields.getTextInputValue('stock_name') || '').trim();
		// Accepter "123 456" ou "123456" : on garde uniquement les chiffres puis on vérifie qu'il y en a 6
		const rawCode = (fields.getTextInputValue('stock_code') || '').trim();
		const password = rawCode.replace(/\D/g, '');

		const errors = [];
		if (!validateRegionOrCity(regionRaw)) errors.push(translations.translate('STOCKPILE_INVALID_REGION'));
		if (!validateRegionOrCity(cityRaw)) errors.push(translations.translate('STOCKPILE_INVALID_CITY'));
		if (!validateName(name)) errors.push(translations.translate('STOCKPILE_INVALID_NAME'));
		if (!validatePassword(password)) errors.push(translations.translate('STOCKPILE_INVALID_PASSWORD'));

		if (errors.length > 0) {
			return await interaction.reply({
				content: errors.join('\n'),
				flags: 64,
			});
		}

		try {
			// Limite de stocks actifs (liée au nombre max de boutons).
			const activeCount = await Stockpile.countDocuments({ server_id: guild.id, deleted: false });
			if (activeCount >= DISCORD_MAX_BUTTONS_PER_MESSAGE) {
				return await interaction.reply({
					content: translations.translate('STOCKPILE_MAX_REACHED'),
					flags: 64,
				});
			}

			// Numéro incrémental par serveur (tous les stocks confondus).
			const count = await Stockpile.countDocuments({ server_id: guild.id });
			const nextId = (count + 1).toString();

			const now = new Date();
			const expiresAt = new Date(now.getTime() + STOCKPILE_RESET_DURATION_MS);

			const region = normalizeForDb(regionRaw);
			const city = normalizeForDb(cityRaw);

			await Stockpile.create({
				id: nextId,
				server_id: guild.id,
				name,
				password,
				region,
				city,
				group_id: channelId,
				owner_id: user.id,
				lastResetAt: now,
				expiresAt,
			});

			await interaction.reply({
				content: translations.translate('STOCKPILE_CREATE_SUCCESS', { id: nextId }),
				flags: 64,
			});
			sendToSubscribers(client, guild.id, 'stockpile_activity', (t) => ({
				content: t.translate('NOTIFICATION_STOCKPILE_ADDED', {
					user: `<@${user.id}>`,
					name: safeEscapeMarkdown(name),
					id: nextId,
					region: safeEscapeMarkdown(formatForDisplay(region)),
					city: safeEscapeMarkdown(formatForDisplay(city)),
				}),
			})).catch(() => undefined);
			const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
			const { embed: listEmbed, isEmpty } = await buildStockpileListEmbed(Stockpile, guild.id, translations);
			const MESSAGE_TYPE = 'stockpile_list';
			const expectedListTitle = `🔑 ${translations.translate('STOCKPILE_LIST_CODES')}`;
			const fallbackMatcher = (msgs) =>
				msgs.find((m) => m.author?.id === client.user.id && m.embeds?.[0]?.title === expectedListTitle) ?? null;

			if (isEmpty) {
				await editTrackedOrFallback({
					channel: interaction.channel,
					serverId: guild.id,
					messageType: MESSAGE_TYPE,
					model: TrackedMessage,
					fallbackMatcher,
					editPayload: {
						content: translations.translate('STOCKPILE_LIST_EMPTY'),
						embeds: [],
						components: [],
					},
					fallbackSend: () => interaction.followUp({
						content: translations.translate('STOCKPILE_LIST_EMPTY'),
					}),
				});
			}
			else {
				const stocks = await Stockpile.find({ server_id: guild.id, deleted: false }).sort({ id: 1 });
				const buttons = stocks.slice(0, DISCORD_MAX_BUTTONS_PER_MESSAGE).map((stock) =>
					new ButtonBuilder()
						.setCustomId(`stockpile_reset-${stock.id}`)
						.setLabel(`#${stock.id}`)
						.setStyle(ButtonStyle.Primary),
				);

				const rows = [];
				for (let i = 0; i < buttons.length; i += 5) {
					const slice = buttons.slice(i, i + 5);
					rows.push(new ActionRowBuilder().addComponents(...slice));
				}

				const payload = { embeds: [listEmbed], components: rows };
				await editTrackedOrFallback({
					channel: interaction.channel,
					serverId: guild.id,
					messageType: MESSAGE_TYPE,
					model: TrackedMessage,
					fallbackMatcher,
					editPayload: payload,
					fallbackSend: () => interaction.followUp(payload),
				});
			}
		}
		catch (err) {
			console.error(err);
			return await interaction.reply({
				content: translations.translate('STOCKPILE_CREATE_ERROR'),
				flags: 64,
			});
		}
	},
};

