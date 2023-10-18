const { Material, Group } = require('../../../data/models.js');
const Translate = require('../../../utils/translations.js');

module.exports = {
	id: 'button_logistics_close',

	async execute(interaction) {
		const { client, guild, channelId } = interaction;
		const translations = new Translate(client, guild.id);

		await Group.findOne({ threadId: `${channelId}` }).exec()
			.then(async group => {
				const thread = interaction.guild.channels.cache.get(`${channelId}`);

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

				await Material.deleteMany({ group_id: `${channelId}` });

				const parentChannel = client.channels.cache.get(interaction.channel.parentId);
				await parentChannel.messages.fetch(thread.id).then(msg => msg.delete());

				await thread.delete(true);

				await group.deleteOne({ threadId: `${channelId}` });
			}).catch(err => {
				console.error(err);
				return interaction.reply({
					content: translations.translate('THREAD_CLOSE_ERROR'),
					ephemeral: true,
				});
			});

	},
};
