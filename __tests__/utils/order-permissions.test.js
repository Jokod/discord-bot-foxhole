const { PermissionFlagsBits } = require('discord.js');
const {
	canManageBoard,
	canManageLine,
	hasManagePermissions,
} = require('../../utils/order-permissions.js');

describe('order-permissions', () => {
	function interaction({ userId, manageGuild = false, manageChannels = false }) {
		return {
			user: { id: userId },
			member: {
				permissions: {
					has: (flag) => manageGuild && flag === PermissionFlagsBits.ManageGuild,
				},
				permissionsIn: () => ({
					has: (flag) => manageChannels && flag === PermissionFlagsBits.ManageChannels,
				}),
			},
			channel: { id: 'c1' },
		};
	}

	it('canManageBoard: owner', () => {
		expect(canManageBoard(interaction({ userId: 'u1' }), { owner_id: 'u1' })).toBe(true);
	});

	it('canManageBoard: ManageGuild', () => {
		expect(canManageBoard(interaction({ userId: 'u2', manageGuild: true }), { owner_id: 'u1' })).toBe(true);
	});

	it('canManageBoard: refuse sinon', () => {
		expect(canManageBoard(interaction({ userId: 'u2' }), { owner_id: 'u1' })).toBe(false);
		expect(canManageBoard(interaction({ userId: 'u1' }), null)).toBe(false);
		expect(canManageBoard({ user: null }, { owner_id: 'u1' })).toBe(false);
	});

	it('canManageLine: ManageGuild sans owner', () => {
		expect(canManageLine(
			interaction({ userId: 'mod', manageGuild: true }),
			{ owner_id: 'other' },
			{ owner_id: 'board' },
		)).toBe(true);
	});

	it('canManageLine refuse sans user', () => {
		expect(canManageLine({ user: null }, { owner_id: 'x' }, {})).toBe(false);
	});

	it('hasManagePermissions refuse sans member.permissions', () => {
		expect(hasManagePermissions({ user: { id: 'x' }, member: {} })).toBe(false);
	});

	it('hasManagePermissions refuse sans channel pour ManageChannels', () => {
		expect(hasManagePermissions({
			user: { id: 'x' },
			member: {
				permissions: { has: () => false },
				permissionsIn: () => ({ has: () => true }),
			},
			channel: null,
		})).toBe(false);
	});
	it('canManageLine: owner ligne ou board', () => {
		const i = interaction({ userId: 'line-owner' });
		expect(canManageLine(i, { owner_id: 'line-owner' }, { owner_id: 'board' })).toBe(true);
		expect(canManageLine(
			interaction({ userId: 'board-owner' }),
			{ owner_id: 'other' },
			{ owner_id: 'board-owner' },
		)).toBe(true);
	});

	it('hasManagePermissions via ManageChannels', () => {
		expect(hasManagePermissions(interaction({ userId: 'x', manageChannels: true }))).toBe(true);
	});
});
