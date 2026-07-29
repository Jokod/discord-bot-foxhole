const { PermissionFlagsBits } = require('discord.js');
const { Stockpile } = require('../../../data/models.js');
const Translate = require('../../../utils/translations.js');
const { buildStockpileListEmbed, buildStockpileListComponents } = require('../../embeds/stockpileList.js');
const { sendToSubscribers } = require('../../../utils/notifications.js');
const { safeEscapeMarkdown } = require('../../../utils/markdown.js');

module.exports = {
	id: 'select_stockpile_remove',

	async execute(interaction) {
		const { client, guild, values, user } = interaction;
		const translations = new Translate(client, guild.id);
		const stockRef = values[0];

		await interaction.deferUpdate();

		const stock = await Stockpile.findById(stockRef);

		if (!stock || stock.server_id !== guild.id) {
			return interaction.followUp({
				content: translations.translate('STOCKPILE_NOT_EXIST'),
				flags: 64,
			});
		}

		const isOwner = !stock.owner_id || stock.owner_id === '0' || stock.owner_id === user.id;
		const canManage = interaction.member?.permissions?.has(PermissionFlagsBits.ManageGuild)
			|| (interaction.channel
				&& interaction.member?.permissionsIn?.(interaction.channel)?.has(PermissionFlagsBits.ManageChannels));
		if (!isOwner && !canManage) {
			return interaction.followUp({
				content: translations.translate('STOCKPILE_ARE_NO_OWNER_ERROR'),
				flags: 64,
			});
		}

		if (stock.deleted) {
			return interaction.followUp({
				content: translations.translate('STOCKPILE_ALREADY_DELETED'),
				flags: 64,
			});
		}

		stock.deleted = true;
		stock.deletedAt = new Date();
		await stock.save();

		sendToSubscribers(client, guild.id, 'stockpile_activity', (t) => ({
			content: t.translate('NOTIFICATION_STOCKPILE_REMOVED', {
				user: `<@${user.id}>`,
				name: safeEscapeMarkdown(stock.name),
				id: stock.id,
			}),
		})).catch(() => undefined);

		const { embed, isEmpty } = await buildStockpileListEmbed(Stockpile, guild.id, translations);
		if (isEmpty) {
			await interaction.editReply({
				content: translations.translate('STOCKPILE_LIST_EMPTY'),
				embeds: [],
				components: [],
			});
		}
		else {
			const components = await buildStockpileListComponents(Stockpile, guild.id, translations);
			await interaction.editReply({
				content: '',
				embeds: [embed],
				components,
			});
		}

		return interaction.followUp({
			content: translations.translate('STOCKPILE_MARK_DELETED_SUCCESS', { id: stock.id }),
			flags: 64,
		});
	},
};
