const { OrderBoard, Operation } = require('../../data/models.js');

const ACTIVE_OP_STATUSES = ['pending', 'started'];

module.exports = {
	name: 'order',
	init: true,

	/**
	 * @param {import('discord.js').AutocompleteInteraction & { client: import('../../typings').Client }} interaction
	 */
	async execute(interaction) {
		const focused = interaction.options.getFocused(true);
		const guildId = interaction.guild?.id;
		const channelId = interaction.channel?.id;
		const query = String(focused.value || '').trim();

		if (focused.name === 'name') {
			if (!guildId || !channelId) return interaction.respond([]);
			const filter = { guild_id: guildId, channel_id: channelId };
			if (query) {
				filter.name = { $regex: query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' };
			}
			const boards = await OrderBoard.find(filter).select('name').sort({ name: 1 }).limit(25).lean();
			return interaction.respond(
				boards.map((b) => ({ name: b.name.slice(0, 100), value: b.name.slice(0, 100) })),
			);
		}

		if (focused.name === 'operation') {
			if (!guildId) return interaction.respond([]);
			const filter = {
				guild_id: guildId,
				status: { $in: ACTIVE_OP_STATUSES },
			};
			if (query) {
				filter.$and = [
					{
						$or: [
							{ title: { $regex: query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' } },
							{ operation_id: { $regex: query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' } },
						],
					},
				];
			}
			const ops = await Operation.find(filter).sort({ _id: -1 }).limit(25).lean();
			return interaction.respond(
				ops.map((op) => {
					const status = op.status === 'started' ? '▶' : '⏳';
					const label = `${status} ${op.title || 'OP'}`.slice(0, 100);
					return {
						name: label,
						value: String(op.operation_id).slice(0, 100),
					};
				}),
			);
		}

		return interaction.respond([]);
	},
};
