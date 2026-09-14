const { PermissionFlagsBits } = require('discord.js');
const Translate = require('../../../utils/translations.js');
const { resetServerWarData } = require('../../../utils/serverReset.js');
const { v2Text, buildV2Payload } = require('../../../utils/componentsV2.js');

module.exports = {
	id: 'server_reset_confirm',
	init: true,

	async execute(interaction) {
		const { client, guild } = interaction;
		const translations = new Translate(client, guild.id);

		const canManage = interaction.member?.permissions?.has(PermissionFlagsBits.ManageGuild);
		if (!canManage) {
			return interaction.reply(v2Text(translations.translate('NO_PERMS'), { ephemeral: true }));
		}

		await interaction.deferUpdate();
		const counts = await resetServerWarData(client, guild.id);
		return interaction.editReply(buildV2Payload({
			children: [translations.translate('SERVER_RESET_SUCCESS', {
				boards: counts.boards,
				stockpiles: counts.stockpiles,
				operations: counts.operations,
			})],
			actionRows: [],
		}));
	},
};
