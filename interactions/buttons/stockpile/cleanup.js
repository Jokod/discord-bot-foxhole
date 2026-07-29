const { PermissionFlagsBits } = require('discord.js');
const { Stockpile } = require('../../../data/models.js');
const Translate = require('../../../utils/translations.js');
const { buildStockpileListEmbed, buildStockpileListComponents } = require('../../embeds/stockpileList.js');

module.exports = {
	id: 'stockpile_cleanup',

	async execute(interaction) {
		const { client, guild } = interaction;
		const translations = new Translate(client, guild.id);

		const canManage = interaction.member?.permissions?.has(PermissionFlagsBits.ManageGuild)
			|| (interaction.channel
				&& interaction.member?.permissionsIn?.(interaction.channel)?.has(PermissionFlagsBits.ManageChannels));
		if (!canManage) {
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
			content: translations.translate('STOCKPILE_CLEANUP_SUCCESS', { count }),
			flags: 64,
		});
	},
};
