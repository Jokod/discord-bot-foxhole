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
		// Deconstructed client from interaction object.
		const { client } = interaction;
		const guildId = interaction.guild.id;
		const translations = new Translate(client, guildId);

		// Checks if the interaction is a command (to prevent weird bugs)

		if (!interaction.isChatInputCommand()) return;

		const command = client.slashCommands.get(interaction.commandName);

		// If the interaction is not a command in cache.

		if (!command) return;

		const server = await Server.findOne({ guild_id: guildId });

		if (command.init && !server) {
			return interaction.reply({
				content: translations.translate('SERVER_IS_NOT_INIT'),
				flags: 64,
			});
		}

		// A try to executes the interaction.

		try {
			await command.execute(interaction);

			// Update stats at each command (covers existing servers + keeps data current)
			if (interaction.guild) {
				const guild = interaction.guild;
				const commandName = interaction.commandName;
				const now = new Date();

				// Pipeline: set first_command_at only when null/missing (MongoDB $min keeps null < Date)
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
					{ upsert: true, new: true, updatePipeline: true },
				);
			}
		}
		catch (err) {
			console.error(err);
			await interaction.reply({
				content: translations.translate('COMMAND_EXECUTE_ERROR'),
				flags: 64,
			});
		}
	},
};
