const Translate = require('../../../utils/translations.js');
const { buildV2Payload } = require('../../../utils/componentsV2.js');

module.exports = {
	id: 'server_reset_cancel',
	init: true,

	async execute(interaction) {
		const { client, guild } = interaction;
		const translations = new Translate(client, guild.id);

		return interaction.update(buildV2Payload({
			children: [translations.translate('SERVER_RESET_CANCELLED')],
			actionRows: [],
		}));
	},
};
