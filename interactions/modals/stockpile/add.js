const { Stockpile } = require('../../../data/models.js');
const Translate = require('../../../utils/translations.js');
const { normalizeForDb, formatForDisplay } = require('../../../utils/formatLocation.js');
const { buildStockpileListEmbed } = require('../../embeds/stockpileList.js');
const { sendToSubscribers } = require('../../../utils/notifications.js');

module.exports = {
	id: 'modal_stockpile_add',

	async execute(interaction) {
		const { client, guild, channelId, user, fields } = interaction;
		const translations = new Translate(client, guild.id);

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
			// Numéro incrémental par serveur.
			const count = await Stockpile.countDocuments({ server_id: guild.id });
			const nextId = (count + 1).toString();

			const now = new Date();
			const expiresAt = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);

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
				content: translations.translate('STOCKPILE_CREATE_SUCCESS'),
				flags: 64,
			});
			sendToSubscribers(client, guild.id, 'stockpile_activity', (t) => ({
				content: t.translate('NOTIFICATION_STOCKPILE_ADDED', {
					user: `<@${user.id}>`,
					name,
					id: nextId,
					region: formatForDisplay(region),
					city: formatForDisplay(city),
				}),
			})).catch(() => undefined);
			const { embed: listEmbed, isEmpty } = await buildStockpileListEmbed(Stockpile, guild.id, translations);
			await interaction.followUp(
				isEmpty ? { content: translations.translate('STOCKPILE_LIST_EMPTY'), flags: 64 } : { embeds: [listEmbed] },
			);
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

