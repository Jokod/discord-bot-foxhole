const { PermissionFlagsBits } = require('discord.js');
const Translate = require('../../../utils/translations.js');
const { resetServerWarData } = require('../../../utils/serverReset.js');

module.exports = {
	id: 'server_reset_confirm',
	init: true,

	async execute(interaction) {
		const { client, guild } = interaction;
		const translations = new Translate(client, guild.id);

		const canManage = interaction.member?.permissions?.has(PermissionFlagsBits.ManageGuild);
		if (!canManage) {
			return interaction.reply({
				content: translations.translate('NO_PERMS'),
				flags: 64,
			});
		}

		await interaction.deferUpdate();
		const counts = await resetServerWarData(client, guild.id);
		return interaction.editReply({
			content: translations.translate('SERVER_RESET_SUCCESS', {
				boards: counts.boards,
				stockpiles: counts.stockpiles,
				operations: counts.operations,
			}),
			components: [],
		});
	},
};
