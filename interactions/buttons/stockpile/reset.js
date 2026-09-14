const { Stockpile } = require('../../../data/models.js');
const Translate = require('../../../utils/translations.js');
const { buildStockpileListPayload } = require('../../embeds/stockpileList.js');
const { STOCKPILE_RESET_DURATION_MS } = require('../../../utils/constants.js');
const { v2Text } = require('../../../utils/componentsV2.js');

module.exports = {
	id: 'stockpile_reset',

	async execute(interaction) {
		const { client, guild, customId } = interaction;
		const translations = new Translate(client, guild.id);

		const stockRef = customId.slice('stockpile_reset-'.length);

		await interaction.deferUpdate();

		const isNumericId = /^\d+$/.test(stockRef) && stockRef.length < 24;
		const isObjectId = /^[a-f0-9]{24}$/i.test(stockRef);
		if (!stockRef || (!isNumericId && !isObjectId)) {
			return interaction.followUp(v2Text(translations.translate('STOCKPILE_INVALID_ID'), { ephemeral: true }));
		}

		const stockToReset = isObjectId
			? await Stockpile.findOne({ _id: stockRef, server_id: guild.id })
			: await Stockpile.findOne({ server_id: guild.id, id: stockRef });

		if (!stockToReset) {
			return interaction.followUp(v2Text(translations.translate('STOCKPILE_NOT_EXIST'), { ephemeral: true }));
		}
		if (stockToReset.deleted) {
			return interaction.followUp(v2Text(translations.translate('STOCKPILE_ALREADY_DELETED'), { ephemeral: true }));
		}

		const resetNow = new Date();
		stockToReset.lastResetAt = resetNow;
		stockToReset.expiresAt = new Date(resetNow.getTime() + STOCKPILE_RESET_DURATION_MS);
		stockToReset.expiry_reminders_sent = [];
		await stockToReset.save();

		const payload = await buildStockpileListPayload(Stockpile, guild.id, translations);
		await interaction.editReply(payload);

		await interaction.followUp(v2Text(
			translations.translate('STOCKPILE_RESET_SUCCESS', { id: stockToReset.id }),
			{ ephemeral: true },
		));
	},
};
