const { hasManagePermissions } = require('./order-permissions.js');

/**
 * Accès à `/stockpile manage` : perms serveur/salon ou créateur d’au moins un dépôt.
 * @param {import('discord.js').Interaction} interaction
 * @param {import('mongoose').Model} Stockpile
 * @returns {Promise<boolean>}
 */
async function canAccessStockpileManage(interaction, Stockpile) {
	if (hasManagePermissions(interaction)) return true;
	if (!interaction.guild || !interaction.user) return false;

	const owned = await Stockpile.exists({
		server_id: interaction.guild.id,
		owner_id: interaction.user.id,
	});
	return Boolean(owned);
}

/**
 * Peut supprimer / gérer un dépôt précis : créateur ou perms serveur/salon.
 * @param {import('discord.js').Interaction} interaction
 * @param {{ owner_id?: string }} stock
 * @returns {boolean}
 */
function canManageStockpile(interaction, stock) {
	if (!interaction.user) return false;
	const ownerId = stock?.owner_id;
	if (!ownerId || ownerId === '0' || ownerId === interaction.user.id) return true;
	return hasManagePermissions(interaction);
}

module.exports = {
	canAccessStockpileManage,
	canManageStockpile,
	hasManagePermissions,
};
