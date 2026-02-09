const { Operation, Group } = require('../../../data/models.js');
const Translate = require('../../../utils/translations.js');

module.exports = {
	id: 'button_create_operation_finished',

	async execute(interaction) {
		const { client, guild, message, user, channel } = interaction;
		const operationId = message.id;
		const translations = new Translate(client, guild.id);

		try {
			const operation = await Operation.findOne({ guild_id: guild.id, operation_id: `${operationId}` });

			if (!operation) {
				return await interaction.reply({
					content: translations.translate('OPERATION_NOT_EXIST'),
					flags: 64,
				});
			}

			if (user.id !== operation.owner_id) {
				return await interaction.reply({
					content: translations.translate('OPERATION_ARE_NO_OWNER_ERROR'),
					flags: 64,
				});
			}

			const content = `**${translations.translate('OPERATION_CREATOR')}:** <@${operation.owner_id}>\n**${translations.translate('DATE')}:** ${operation.date}\n**${translations.translate('HOURS')}:** ${operation.time}\n**${translations.translate('DURATION')}:** ${operation.duration} min\n**${translations.translate('DESCRIPTION')}:** ${operation.description}`;

			Group.find({ guild_id: guild.id, operation_id: `${operationId}` }).exec()
				.then(threads => {
					threads.forEach(async thread => {
						const result = channel.threads.cache.find(t => t.id === thread.threadId);
						await result.setLocked(true);
						await result.setArchived(true);
					});
				}).catch(err => console.error(err));

			await Operation.updateOne({ guild_id: guild.id, operation_id: `${operationId}` }, { status: 'finished' });

			await interaction.update({
				content: `${translations.translate('OPERATION_FINISHED_SUCCESS', { title: operation.title })}\n${content}`,
				components: [],
			});
		}
		catch (err) {
			console.error(err);
			return await interaction.reply({
				content: translations.translate('OPERATION_FINISHED_ERROR'),
				flags: 64,
			});
		}
	},
};
