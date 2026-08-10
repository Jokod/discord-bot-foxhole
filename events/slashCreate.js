const { Events } = require('discord.js');
const { Server, Stats } = require('../data/models.js');
const Translate = require('../utils/translations.js');

module.exports = {
	name: Events.InteractionCreate,

	/**
	 * @description Executes when an interaction is created and handle it.

	 * @param {import('discord.js').CommandInteraction & { client: import('../typings').Client }} interaction The interaction which was created
	 */

	async execute(interaction) {
		if (!interaction.isChatInputCommand()) return;

		const { client } = interaction;
		const guildId = interaction.guild?.id;
		const translations = new Translate(client, guildId);

		const command = client.slashCommands.get(interaction.commandName);

		if (!command) return;

		const server = guildId ? await Server.findOne({ guild_id: guildId }) : null;

		if (command.init && !server) {
			return interaction.reply({
				content: translations.translate('SERVER_IS_NOT_INIT'),
				flags: 64,
			});
		}

		try {
			await command.execute(interaction);

			if (interaction.guild && guildId) {
				const guild = interaction.guild;
				const commandName = interaction.commandName;
				const now = new Date();

				await Stats.findOneAndUpdate(
					{ guild_id: guildId },
					[
						{
							$set: {
								name: guild.name,
								created_at: guild.createdAt,
								last_command_at: now,
								member_count: guild.memberCount ?? 0,
								[`last_command_by_type.${commandName}`]: now,
								first_command_at: { $ifNull: ['$first_command_at', '$$NOW'] },
							},
						},
						{
							$set: {
								command_count: { $add: [{ $ifNull: ['$command_count', 0] }, 1] },
								[`command_breakdown.${commandName}`]: {
									$add: [{ $ifNull: [`$command_breakdown.${commandName}`, 0] }, 1],
								},
							},
						},
					],
					{ upsert: true, returnDocument: 'after', updatePipeline: true },
				);
			}
		}
		catch (err) {
			console.error(err);
			try {
				const payload = {
					content: translations.translate('COMMAND_EXECUTE_ERROR'),
					flags: 64,
				};
				if (interaction.replied || interaction.deferred) {
					await interaction.followUp(payload);
				}
				else {
					await interaction.reply(payload);
				}
			}
			catch (replyErr) {
				console.error('Failed to send error message to interaction:', replyErr);
			}
		}
	},
};
