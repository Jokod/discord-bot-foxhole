const { PermissionFlagsBits } = require('discord.js');
const { Stockpile, TrackedMessage } = require('../../../data/models.js');
const Translate = require('../../../utils/translations.js');

module.exports = {
	id: 'stockpile_deleteall',

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

		await Stockpile.deleteMany({ server_id: guild.id });
		await TrackedMessage.deleteMany({
			server_id: guild.id,
			message_type: 'stockpile_list',
		}).catch(() => undefined);

		await interaction.editReply({
			content: translations.translate('STOCKPILE_LIST_EMPTY'),
			embeds: [],
			components: [],
		});

		await interaction.followUp({
			content: translations.translate('STOCKPILE_RESET_ALL_SUCCESS'),
			flags: 64,
		});
	},
};
