const { Operation, Group } = require('../../../data/models.js');
const Translate = require('../../../utils/translations.js');

module.exports = {
	id: 'button_create_operation_finished',

	async execute(interaction) {
		const operationId = interaction.customId.split('-')[1];
		const translations = new Translate(interaction.client, interaction.guild.id);

		try {
			const operation = await Operation.findOne({ operation_id: `${operationId}` });

			if (interaction.user.id !== operation.owner_id) {
				return await interaction.reply({
					content: translations.translate('OPERATION_ARE_NO_OWNER_ERROR'),
					ephemeral: true,
				});
			}

			const content = `**${translations.translate('ID')}:** ${operationId}\n**${translations.translate('OPERATION_CREATOR')}:** <@${operation.owner_id}>\n**${translations.translate('DATE')}:** ${operation.date}\n**${translations.translate('HOURS')}:** ${operation.time}\n**${translations.translate('DURATION')}:** ${operation.duration} min\n**${translations.translate('DESCRIPTION')}:** ${operation.description}`;

			Group.find({ operation_id: `${operationId}` }).exec()
				.then(threads => {
					threads.forEach(async thread => {
						const result = interaction.channel.threads.cache.find(t => t.id === thread.threadId);
						await result.setLocked(true);
						await result.setArchived(true);
					});
				}).catch(err => console.error(err));

			await Operation.updateOne({ operation_id: `${operationId}` }, { status: 'finished' });

			await interaction.update({
				content: `${translations.translate('OPERATION_FINISHED_SUCCESS', { title: operation.title })}\n${content}`,
				components: [],
			});
		}
		catch (err) {
			console.error(err);
			return await interaction.reply({
				content: translations.translate('OPERATION_FINISHED_ERROR'),
				ephemeral: true,
			});
		}
	},
};
