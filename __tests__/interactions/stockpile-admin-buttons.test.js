const mockTranslate = jest.fn((key, params = {}) => {
	if (params.count != null) return `${key}#${params.count}`;
	if (params.id != null) return `${key}#${params.id}`;
	return key;
});

jest.mock('../../utils/translations.js', () => jest.fn().mockImplementation(() => ({ translate: mockTranslate })));

const mockBuildStockpileManagePayload = jest.fn().mockResolvedValue({
	content: '',
	embeds: [],
	components: [],
});
jest.mock('../../interactions/embeds/stockpileList.js', () => ({
	buildStockpileManagePayload: (...args) => mockBuildStockpileManagePayload(...args),
}));

jest.mock('../../utils/stockpile-permissions.js', () => ({
	hasManagePermissions: jest.fn(() => true),
	canManageStockpile: jest.fn(() => true),
}));

const mockRefreshLists = jest.fn().mockResolvedValue(1);
jest.mock('../../utils/stockpileListSync.js', () => ({
	refreshTrackedStockpileLists: (...args) => mockRefreshLists(...args),
}));

jest.mock('../../utils/notifications.js', () => ({
	sendToSubscribers: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../utils/markdown.js', () => ({
	safeEscapeMarkdown: (x) => x,
}));

const mockDeleteMany = jest.fn().mockResolvedValue({ deletedCount: 2 });
const mockFindOne = jest.fn();
const mockTrackedDeleteMany = jest.fn().mockResolvedValue({ deletedCount: 1 });

jest.mock('../../data/models.js', () => ({
	Stockpile: {
		deleteMany: (...args) => mockDeleteMany(...args),
		findOne: (...args) => mockFindOne(...args),
	},
	TrackedMessage: {
		deleteMany: (...args) => mockTrackedDeleteMany(...args),
	},
}));

const { hasManagePermissions, canManageStockpile } = require('../../utils/stockpile-permissions.js');
const { sendToSubscribers } = require('../../utils/notifications.js');
const { Stockpile } = require('../../data/models.js');
const cleanup = require('../../interactions/buttons/stockpile/cleanup.js');
const deleteall = require('../../interactions/buttons/stockpile/deleteall.js');
const remove = require('../../interactions/select-menus/stockpile/remove.js');

describe('Stockpile admin handlers', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		hasManagePermissions.mockReturnValue(true);
		canManageStockpile.mockReturnValue(true);
		mockBuildStockpileManagePayload.mockResolvedValue({ content: '', embeds: [], components: [] });
		mockDeleteMany.mockResolvedValue({ deletedCount: 2 });
		mockRefreshLists.mockResolvedValue(1);
	});

	function base(extra = {}) {
		return {
			client: { traductions: new Map() },
			guild: { id: 'guild-123' },
			user: { id: 'u1' },
			values: extra.values || [],
			reply: jest.fn().mockResolvedValue(undefined),
			deferUpdate: jest.fn().mockResolvedValue(undefined),
			editReply: jest.fn().mockResolvedValue(undefined),
			followUp: jest.fn().mockResolvedValue(undefined),
		};
	}

	describe('stockpile_cleanup', () => {
		it('refuse sans permission', async () => {
			hasManagePermissions.mockReturnValue(false);
			const i = base();
			await cleanup.execute(i);
			expect(mockDeleteMany).not.toHaveBeenCalled();
			expect(i.reply).toHaveBeenCalledWith(expect.objectContaining({ content: 'NO_PERMS' }));
		});

		it('supprime les stocks deleted et refresh', async () => {
			const i = base();
			await cleanup.execute(i);
			expect(i.deferUpdate).toHaveBeenCalled();
			expect(mockDeleteMany).toHaveBeenCalledWith({
				server_id: 'guild-123',
				deleted: true,
			});
			expect(mockBuildStockpileManagePayload).toHaveBeenCalled();
			expect(mockRefreshLists).toHaveBeenCalledWith(i.client, { guildIds: ['guild-123'] });
			expect(i.followUp).toHaveBeenCalledWith(expect.objectContaining({
				content: 'STOCKPILE_CLEANUP_SUCCESS#2',
			}));
		});

		it('affiche count 0 si deletedCount absent', async () => {
			mockDeleteMany.mockResolvedValue({});
			const i = base();
			await cleanup.execute(i);
			expect(i.followUp).toHaveBeenCalledWith(expect.objectContaining({
				content: 'STOCKPILE_CLEANUP_SUCCESS#0',
			}));
		});

		it('ignore refreshTrackedStockpileLists rejeté', async () => {
			mockRefreshLists.mockRejectedValueOnce(new Error('refresh failed'));
			const i = base();
			await expect(cleanup.execute(i)).resolves.toBeUndefined();
		});
	});

	describe('stockpile_deleteall', () => {
		it('refuse sans permission', async () => {
			hasManagePermissions.mockReturnValue(false);
			const i = base();
			await deleteall.execute(i);
			expect(mockDeleteMany).not.toHaveBeenCalled();
			expect(i.reply).toHaveBeenCalledWith(expect.objectContaining({ content: 'NO_PERMS' }));
		});

		it('wipe stocks + tracked messages', async () => {
			const i = base();
			await deleteall.execute(i);
			expect(i.deferUpdate).toHaveBeenCalled();
			expect(mockDeleteMany).toHaveBeenCalledWith({ server_id: 'guild-123' });
			expect(mockTrackedDeleteMany).toHaveBeenCalledWith({
				server_id: 'guild-123',
				message_type: 'stockpile_list',
			});
			expect(i.followUp).toHaveBeenCalledWith(expect.objectContaining({
				content: 'STOCKPILE_RESET_ALL_SUCCESS',
			}));
		});

		it('ignore TrackedMessage.deleteMany rejeté', async () => {
			mockTrackedDeleteMany.mockRejectedValueOnce(new Error('tracked delete failed'));
			const i = base();
			await expect(deleteall.execute(i)).resolves.toBeUndefined();
		});

		it('ignore refreshTrackedStockpileLists rejeté', async () => {
			mockRefreshLists.mockRejectedValueOnce(new Error('refresh failed'));
			const i = base();
			await expect(deleteall.execute(i)).resolves.toBeUndefined();
		});
	});

	describe('select_stockpile_remove', () => {
		it('refuse stock inconnu', async () => {
			mockFindOne.mockResolvedValue(null);
			const i = base({ values: ['507f1f77bcf86cd799439011'] });
			await remove.execute(i);
			expect(mockFindOne).toHaveBeenCalledWith({
				_id: '507f1f77bcf86cd799439011',
				server_id: 'guild-123',
			});
			expect(i.followUp).toHaveBeenCalledWith(expect.objectContaining({
				content: 'STOCKPILE_NOT_EXIST',
			}));
		});

		it('refuse stock d\'un autre serveur', async () => {
			mockFindOne.mockResolvedValue(null);
			const i = base({ values: ['507f1f77bcf86cd799439011'] });
			await remove.execute(i);
			expect(mockFindOne).toHaveBeenCalledWith({
				_id: '507f1f77bcf86cd799439011',
				server_id: 'guild-123',
			});
			expect(i.followUp).toHaveBeenCalledWith(expect.objectContaining({
				content: 'STOCKPILE_NOT_EXIST',
			}));
		});

		it('refuse sans permission owner', async () => {
			canManageStockpile.mockReturnValue(false);
			mockFindOne.mockResolvedValue({
				server_id: 'guild-123',
				id: '1',
				name: 'Seaport',
				deleted: false,
				save: jest.fn(),
			});
			const i = base({ values: ['507f1f77bcf86cd799439011'] });
			await remove.execute(i);
			expect(i.followUp).toHaveBeenCalledWith(expect.objectContaining({
				content: 'STOCKPILE_ARE_NO_OWNER_ERROR',
			}));
		});

		it('refuse déjà deleted', async () => {
			mockFindOne.mockResolvedValue({
				server_id: 'guild-123',
				id: '1',
				deleted: true,
				save: jest.fn(),
			});
			const i = base({ values: ['507f1f77bcf86cd799439011'] });
			await remove.execute(i);
			expect(i.followUp).toHaveBeenCalledWith(expect.objectContaining({
				content: 'STOCKPILE_ALREADY_DELETED',
			}));
		});

		it('soft-delete et notifie', async () => {
			const save = jest.fn().mockResolvedValue(undefined);
			const stock = {
				server_id: 'guild-123',
				id: '1',
				name: 'Seaport',
				deleted: false,
				save,
			};
			mockFindOne.mockResolvedValue(stock);
			const i = base({ values: ['507f1f77bcf86cd799439011'] });
			await remove.execute(i);
			expect(stock.deleted).toBe(true);
			expect(stock.deletedAt).toBeInstanceOf(Date);
			expect(save).toHaveBeenCalled();
			expect(sendToSubscribers).toHaveBeenCalled();
			expect(mockBuildStockpileManagePayload).toHaveBeenCalledWith(Stockpile, 'guild-123', expect.anything());
			expect(i.followUp).toHaveBeenCalledWith(expect.objectContaining({
				content: 'STOCKPILE_MARK_DELETED_SUCCESS#1',
			}));
		});

		it('ignore sendToSubscribers et refresh rejetés', async () => {
			sendToSubscribers.mockRejectedValueOnce(new Error('notify failed'));
			mockRefreshLists.mockRejectedValueOnce(new Error('refresh failed'));
			const save = jest.fn().mockResolvedValue(undefined);
			mockFindOne.mockResolvedValue({
				server_id: 'guild-123',
				id: '1',
				name: 'Seaport',
				deleted: false,
				save,
			});
			const i = base({ values: ['507f1f77bcf86cd799439011'] });
			await expect(remove.execute(i)).resolves.toBeUndefined();
		});

		it('exécute le callback sendToSubscribers', async () => {
			const save = jest.fn().mockResolvedValue(undefined);
			mockFindOne.mockResolvedValue({
				server_id: 'guild-123',
				id: '1',
				name: 'Seaport',
				deleted: false,
				save,
			});
			const i = base({ values: ['507f1f77bcf86cd799439011'] });
			await remove.execute(i);
			const factory = sendToSubscribers.mock.calls[0][3];
			const payload = factory({ translate: mockTranslate });
			expect(payload.content).toContain('NOTIFICATION_STOCKPILE_REMOVED');
		});
	});
});
