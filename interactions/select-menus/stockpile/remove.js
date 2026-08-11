const { Stockpile } = require('../../../data/models.js');
const Translate = require('../../../utils/translations.js');
const { buildStockpileManagePayload } = require('../../embeds/stockpileList.js');
const { canManageStockpile } = require('../../../utils/stockpile-permissions.js');
const { sendToSubscribers } = require('../../../utils/notifications.js');
const { safeEscapeMarkdown } = require('../../../utils/markdown.js');
const { refreshTrackedStockpileLists } = require('../../../utils/stockpileListSync.js');

module.exports = {
	id: 'select_stockpile_remove',

	async execute(interaction) {
		const { client, guild, values, user } = interaction;
		const translations = new Translate(client, guild.id);
		const stockRef = values[0];

		await interaction.deferUpdate();

		const stock = await Stockpile.findOne({ _id: stockRef, server_id: guild.id });

		if (!stock) {
			return interaction.followUp({
				content: translations.translate('STOCKPILE_NOT_EXIST'),
				flags: 64,
			});
		}

		if (!canManageStockpile(interaction, stock)) {
			return interaction.followUp({
				content: translations.translate('STOCKPILE_ARE_NO_OWNER_ERROR'),
				flags: 64,
			});
		}

		if (stock.deleted) {
			return interaction.followUp({
				content: translations.translate('STOCKPILE_ALREADY_DELETED'),
				flags: 64,
			});
		}

		stock.deleted = true;
		stock.deletedAt = new Date();
		await stock.save();

		sendToSubscribers(client, guild.id, 'stockpile_activity', (t) => ({
			content: t.translate('NOTIFICATION_STOCKPILE_REMOVED', {
				user: `<@${user.id}>`,
				name: safeEscapeMarkdown(stock.name),
				id: stock.id,
			}),
		})).catch(() => undefined);

		await interaction.editReply(await buildStockpileManagePayload(Stockpile, guild.id, translations));
		await refreshTrackedStockpileLists(client, { guildIds: [guild.id] }).catch(() => undefined);

		return interaction.followUp({
			content: translations.translate('STOCKPILE_MARK_DELETED_SUCCESS', { id: stock.id }),
			flags: 64,
		});
	},
};
