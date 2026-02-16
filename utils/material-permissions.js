const { PermissionFlagsBits } = require('discord.js');

/**
 * Returns true if the user can manage the material (modify, delete, change priority, etc.).
 * Allowed: creator (owner_id) OR server manager (Manage Guild) OR channel manager (Manage Channels).
 * @param {import('discord.js').Interaction} interaction
 * @param {{ owner_id: string }} material - Material document with owner_id
 * @returns {boolean}
 */
function canManageMaterial(interaction, material) {
	if (!material || !interaction.user) return false;
	if (interaction.user.id === material.owner_id) return true;

	const member = interaction.member;
	if (!member?.permissions) return false;

	if (member.permissions.has(PermissionFlagsBits.ManageGuild)) return true;
	if (interaction.channel && member.permissionsIn(interaction.channel).has(PermissionFlagsBits.ManageChannels)) return true;

	return false;
}

module.exports = { canManageMaterial };
