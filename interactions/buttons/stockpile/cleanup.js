const { Stockpile } = require('../../../data/models.js');
const Translate = require('../../../utils/translations.js');
const { buildStockpileManagePayload } = require('../../embeds/stockpileList.js');
const { hasManagePermissions } = require('../../../utils/stockpile-permissions.js');
const { refreshTrackedStockpileLists } = require('../../../utils/stockpileListSync.js');

module.exports = {
	id: 'stockpile_cleanup',

	async execute(interaction) {
		const { client, guild } = interaction;
		const translations = new Translate(client, guild.id);

		if (!hasManagePermissions(interaction)) {
			return interaction.reply({
				content: translations.translate('NO_PERMS'),
				flags: 64,
			});
		}

		await interaction.deferUpdate();

		const result = await Stockpile.deleteMany({
			server_id: guild.id,
			deleted: true,
		});

		const count = result.deletedCount || 0;

		await interaction.editReply(await buildStockpileManagePayload(Stockpile, guild.id, translations));
		await refreshTrackedStockpileLists(client, { guildIds: [guild.id] }).catch(() => undefined);

		await interaction.followUp({
			content: translations.translate('STOCKPILE_CLEANUP_SUCCESS', { count }),
			flags: 64,
		});
	},
};
