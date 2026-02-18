const { Stockpile } = require('../../../data/models.js');
const Translate = require('../../../utils/translations.js');
const { buildStockpileListEmbed, buildStockpileListComponents } = require('../../embeds/stockpileList.js');
const { STOCKPILE_RESET_DURATION_MS } = require('../../../utils/constants.js');

module.exports = {
	id: 'stockpile_reset',

	async execute(interaction) {
		const { client, guild, customId } = interaction;
		const translations = new Translate(client, guild.id);

		const parts = customId.split('-');
		const stockId = parts[1];

		if (!stockId || !/^\d+$/.test(stockId)) {
			return interaction.reply({
				content: translations.translate('STOCKPILE_INVALID_ID'),
				flags: 64,
			});
		}

		const stockToReset = await Stockpile.findOne({ server_id: guild.id, id: stockId });

		if (!stockToReset || stockToReset.server_id !== guild.id) {
			return interaction.reply({
				content: translations.translate('STOCKPILE_NOT_EXIST'),
				flags: 64,
			});
		}
		if (stockToReset.deleted) {
			return interaction.reply({
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
			await interaction.update({
				content: translations.translate('STOCKPILE_LIST_EMPTY'),
				embeds: [],
				components: [],
			});
		}
		else {
			const components = await buildStockpileListComponents(Stockpile, guild.id);
			await interaction.update({
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

