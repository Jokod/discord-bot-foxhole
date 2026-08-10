const { Stockpile, TrackedMessage } = require('../../../data/models.js');
const Translate = require('../../../utils/translations.js');
const { buildStockpileManagePayload } = require('../../embeds/stockpileList.js');
const { hasManagePermissions } = require('../../../utils/stockpile-permissions.js');
const { refreshTrackedStockpileLists } = require('../../../utils/stockpileListSync.js');

module.exports = {
	id: 'stockpile_deleteall',

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

		await Stockpile.deleteMany({ server_id: guild.id });
		await refreshTrackedStockpileLists(client, { guildIds: [guild.id] }).catch(() => undefined);
		await TrackedMessage.deleteMany({
			server_id: guild.id,
			message_type: 'stockpile_list',
		}).catch(() => undefined);

		await interaction.editReply(await buildStockpileManagePayload(Stockpile, guild.id, translations));

		await interaction.followUp({
			content: translations.translate('STOCKPILE_RESET_ALL_SUCCESS'),
			flags: 64,
		});
	},
};
