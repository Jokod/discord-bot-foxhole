const Translate = require('../../../utils/translations.js');

module.exports = {
	id: 'server_reset_cancel',
	init: true,

	async execute(interaction) {
		const { client, guild } = interaction;
		const translations = new Translate(client, guild.id);

		return interaction.update({
			content: translations.translate('SERVER_RESET_CANCELLED'),
			components: [],
		});
	},
};
