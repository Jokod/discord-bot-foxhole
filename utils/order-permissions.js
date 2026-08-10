const { PermissionFlagsBits } = require('discord.js');

/**
 * @param {import('discord.js').Interaction} interaction
 * @param {{ owner_id?: string }} line
 * @param {{ owner_id?: string }} [board]
 * @returns {boolean}
 */
function canManageLine(interaction, line, board) {
	if (!interaction.user) return false;
	if (line?.owner_id && interaction.user.id === line.owner_id) return true;
	if (board?.owner_id && interaction.user.id === board.owner_id) return true;
	return hasManagePermissions(interaction);
}

/**
 * @param {import('discord.js').Interaction} interaction
 * @param {{ owner_id: string }} board
 * @returns {boolean}
 */
function canManageBoard(interaction, board) {
	if (!board || !interaction.user) return false;
	if (interaction.user.id === board.owner_id) return true;
	return hasManagePermissions(interaction);
}

/**
 * @param {import('discord.js').Interaction} interaction
 * @returns {boolean}
 */
function hasManagePermissions(interaction) {
	const member = interaction.member;
	if (!member?.permissions) return false;

	if (member.permissions.has(PermissionFlagsBits.ManageGuild)) return true;
	if (interaction.channel && member.permissionsIn(interaction.channel).has(PermissionFlagsBits.ManageChannels)) return true;

	return false;
}

module.exports = { canManageLine, canManageBoard, hasManagePermissions };
