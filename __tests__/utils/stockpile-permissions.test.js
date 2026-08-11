const { PermissionFlagsBits } = require('discord.js');
const {
	canAccessStockpileManage,
	canManageStockpile,
	hasManagePermissions,
} = require('../../utils/stockpile-permissions.js');

describe('stockpile-permissions', () => {
	function createInteraction({ userId = 'user-1', manageGuild = false, manageChannels = false } = {}) {
		return {
			user: { id: userId },
			guild: { id: 'guild-1' },
			channel: { id: 'channel-1' },
			member: {
				permissions: {
					has: (flag) => flag === PermissionFlagsBits.ManageGuild && manageGuild,
				},
				permissionsIn: () => ({
					has: (flag) => flag === PermissionFlagsBits.ManageChannels && manageChannels,
				}),
			},
		};
	}

	describe('hasManagePermissions', () => {
		it('accepte ManageGuild', () => {
			expect(hasManagePermissions(createInteraction({ manageGuild: true }))).toBe(true);
		});

		it('accepte ManageChannels', () => {
			expect(hasManagePermissions(createInteraction({ manageChannels: true }))).toBe(true);
		});

		it('refuse sans permission', () => {
			expect(hasManagePermissions(createInteraction())).toBe(false);
		});
	});

	describe('canManageStockpile', () => {
		it('autorise le créateur', () => {
			expect(canManageStockpile(createInteraction({ userId: 'owner-1' }), { owner_id: 'owner-1' })).toBe(true);
		});

		it('autorise les stocks sans propriétaire', () => {
			expect(canManageStockpile(createInteraction(), { owner_id: '0' })).toBe(true);
			expect(canManageStockpile(createInteraction(), {})).toBe(true);
		});

		it('autorise ManageGuild même si non créateur', () => {
			expect(canManageStockpile(
				createInteraction({ userId: 'other', manageGuild: true }),
				{ owner_id: 'owner-1' },
			)).toBe(true);
		});

		it('refuse un non-créateur sans perms', () => {
			expect(canManageStockpile(
				createInteraction({ userId: 'other' }),
				{ owner_id: 'owner-1' },
			)).toBe(false);
		});

		it('refuse sans user', () => {
			expect(canManageStockpile({ user: null }, { owner_id: 'owner-1' })).toBe(false);
		});
	});

	describe('canAccessStockpileManage', () => {
		it('autorise avec perms serveur', async () => {
			const Stockpile = { exists: jest.fn() };
			await expect(canAccessStockpileManage(
				createInteraction({ manageGuild: true }),
				Stockpile,
			)).resolves.toBe(true);
			expect(Stockpile.exists).not.toHaveBeenCalled();
		});

		it('autorise le créateur d’un dépôt', async () => {
			const Stockpile = { exists: jest.fn().mockResolvedValue(true) };
			await expect(canAccessStockpileManage(createInteraction(), Stockpile)).resolves.toBe(true);
			expect(Stockpile.exists).toHaveBeenCalledWith({
				server_id: 'guild-1',
				owner_id: 'user-1',
			});
		});

		it('refuse sans dépôt ni perms', async () => {
			const Stockpile = { exists: jest.fn().mockResolvedValue(null) };
			await expect(canAccessStockpileManage(createInteraction(), Stockpile)).resolves.toBe(false);
		});

		it('refuse sans guild ou user', async () => {
			const Stockpile = { exists: jest.fn() };
			await expect(canAccessStockpileManage({
				user: { id: 'u1' },
				guild: null,
				member: { permissions: { has: () => false } },
			}, Stockpile)).resolves.toBe(false);
			await expect(canAccessStockpileManage({
				user: null,
				guild: { id: 'guild-1' },
				member: { permissions: { has: () => false } },
			}, Stockpile)).resolves.toBe(false);
			expect(Stockpile.exists).not.toHaveBeenCalled();
		});
	});
});
