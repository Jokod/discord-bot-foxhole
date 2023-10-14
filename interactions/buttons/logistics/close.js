const { Material, Group } = require('../../../data/models.js');
const Translate = require('../../../utils/translations.js');

module.exports = {
	id: 'button_logistics_close',

	async execute(interaction) {
		const threadId = interaction.customId.split('-')[2];
		const translations = new Translate(interaction.client, interaction.guild.id);

		await Group.findOne({ threadId: `${threadId}` }).exec()
			.then(async group => {
				const thread = interaction.guild.channels.cache.get(`${threadId}`);

				if (!thread) {
					return interaction.reply({
						content: translations.translate('THREAD_NOT_EXIST'),
						ephemeral: true,
					});
				}

				if (interaction.user.id !== group.owner_id) {
					return interaction.reply({
						content: translations.translate('THREAD_ARE_NO_OWNER_ERROR'),
						ephemeral: true,
					});
				}

				await Material.deleteMany({ group_id: `${threadId}` });

				await thread.delete(true);
				await group.deleteOne({ threadId: `${threadId}` });
			}).catch(err => {
				console.error(err);
				return interaction.reply({
					content: translations.translate('THREAD_CLOSE_ERROR'),
					ephemeral: true,
				});
			});

	},
};
