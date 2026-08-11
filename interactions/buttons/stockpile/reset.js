const { Stockpile } = require('../../../data/models.js');
const Translate = require('../../../utils/translations.js');
const { buildStockpileListEmbed, buildStockpileListComponents } = require('../../embeds/stockpileList.js');
const { STOCKPILE_RESET_DURATION_MS } = require('../../../utils/constants.js');

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
			return interaction.followUp({
				content: translations.translate('STOCKPILE_INVALID_ID'),
				flags: 64,
			});
		}

		const stockToReset = isObjectId
			? await Stockpile.findOne({ _id: stockRef, server_id: guild.id })
			: await Stockpile.findOne({ server_id: guild.id, id: stockRef });

		if (!stockToReset) {
			return interaction.followUp({
				content: translations.translate('STOCKPILE_NOT_EXIST'),
				flags: 64,
			});
		}
		if (stockToReset.deleted) {
			return interaction.followUp({
				content: translations.translate('STOCKPILE_ALREADY_DELETED'),
				flags: 64,
			});
		}

		const resetNow = new Date();
		stockToReset.lastResetAt = resetNow;
		stockToReset.expiresAt = new Date(resetNow.getTime() + STOCKPILE_RESET_DURATION_MS);
		stockToReset.expiry_reminders_sent = [];
		await stockToReset.save();

		const { embed, isEmpty } = await buildStockpileListEmbed(Stockpile, guild.id, translations);

		if (isEmpty) {
			await interaction.editReply({
				content: translations.translate('STOCKPILE_LIST_EMPTY'),
				embeds: [],
				components: [],
			});
		}
		else {
			const components = await buildStockpileListComponents(Stockpile, guild.id, translations);
			await interaction.editReply({
				content: '',
				embeds: [embed],
				components,
			});
		}

		await interaction.followUp({
			content: translations.translate('STOCKPILE_RESET_SUCCESS', { id: stockToReset.id }),
			flags: 64,
		});
	},
};

