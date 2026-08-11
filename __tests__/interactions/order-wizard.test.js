const mockTranslate = jest.fn((key) => key);
jest.mock('../../utils/translations.js', () => jest.fn().mockImplementation(() => ({ translate: mockTranslate })));

const mockFindBoard = jest.fn();
const mockDeleteLine = jest.fn();
const mockRefresh = jest.fn().mockResolvedValue(true);
const mockSetDraft = jest.fn().mockResolvedValue(undefined);

jest.mock('../../services/order/index.js', () => ({
	findBoardById: (...args) => mockFindBoard(...args),
	deleteLine: (...args) => mockDeleteLine(...args),
	refreshOrderBoard: (...args) => mockRefresh(...args),
	setDraft: (...args) => mockSetDraft(...args),
}));

jest.mock('../../utils/order-permissions.js', () => ({
	canManageLine: jest.fn(() => true),
}));

const mockCreateCategoryRows = jest.fn(() => [{ fake: 'cats' }]);
const mockCreateSubcategoryRows = jest.fn(() => [{ fake: 'subs' }]);
const mockCreateMaterialSelectRows = jest.fn(async () => ({
	content: 'MATERIAL_SELECT_TYPE',
	components: [{ fake: 'mats' }],
}));
const mockGetCamp = jest.fn(async () => 'warden');

jest.mock('../../utils/stockCatalog.js', () => ({
	createCategoryRows: (...args) => mockCreateCategoryRows(...args),
	createSubcategoryRows: (...args) => mockCreateSubcategoryRows(...args),
	createMaterialSelectRows: (...args) => mockCreateMaterialSelectRows(...args),
	getCamp: (...args) => mockGetCamp(...args),
}));

jest.mock('../../data/models.js', () => ({
	OrderLine: {
		findOne: jest.fn(() => ({ lean: async () => null })),
	},
}));

jest.mock('../../utils/orderBoardLog.js', () => ({
	appendOrderLog: jest.fn().mockResolvedValue(true),
}));

const back = require('../../interactions/buttons/order/back.js');
const cat = require('../../interactions/buttons/order/cat.js');
const sub = require('../../interactions/buttons/order/sub.js');
const correct = require('../../interactions/buttons/order/correct.js');
const deleteLine = require('../../interactions/buttons/order/delete_line.js');
const catalog = require('../../interactions/select-menus/order/catalog.js');
const { canManageLine } = require('../../utils/order-permissions.js');
const { OrderLine } = require('../../data/models.js');
const { appendOrderLog } = require('../../utils/orderBoardLog.js');

describe('Order wizard handlers', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		canManageLine.mockReturnValue(true);
		OrderLine.findOne.mockReturnValue({
			lean: async () => ({ line_id: '3', name: 'Bmats', current: 2, target: 10, owner_id: 'u1' }),
		});
	});

	function base(customId, extra = {}) {
		return {
			client: { traductions: new Map() },
			guild: { id: 'g1' },
			channel: { id: 'c1' },
			customId,
			user: { id: 'u1' },
			values: extra.values,
			reply: jest.fn().mockResolvedValue(undefined),
			followUp: jest.fn().mockResolvedValue(undefined),
			deferUpdate: jest.fn().mockResolvedValue(undefined),
			update: jest.fn().mockResolvedValue(undefined),
			showModal: jest.fn().mockResolvedValue(undefined),
		};
	}

	describe('order_back', () => {
		it('refuse customId invalide', async () => {
			const i = base('order_back');
			await back.execute(i);
			expect(i.reply).toHaveBeenCalledWith(expect.objectContaining({ content: 'INTERACTION_ERROR' }));
		});

		it('refuse board manquant', async () => {
			mockFindBoard.mockResolvedValue(null);
			const i = base('order_back|b1');
			await back.execute(i);
			expect(i.reply).toHaveBeenCalledWith(expect.objectContaining({ content: 'ORDER_BOARD_NOT_EXIST' }));
		});

		it('refuse board closed', async () => {
			mockFindBoard.mockResolvedValue({ _id: 'b1', status: 'closed' });
			const i = base('order_back|b1');
			await back.execute(i);
			expect(i.reply).toHaveBeenCalledWith(expect.objectContaining({ content: 'ORDER_STATUS_CLOSED' }));
		});

		it('affiche les catégories', async () => {
			mockFindBoard.mockResolvedValue({ _id: 'b1', status: 'open' });
			const i = base('order_back|b1');
			await back.execute(i);
			expect(mockCreateCategoryRows).toHaveBeenCalled();
			expect(i.update).toHaveBeenCalledWith(expect.objectContaining({
				content: 'MATERIAL_SELECT_CATEGORY',
			}));
		});
	});

	describe('order_cat', () => {
		it('refuse customId incomplet', async () => {
			const i = base('order_cat|b1');
			await cat.execute(i);
			expect(i.reply).toHaveBeenCalledWith(expect.objectContaining({ content: 'INTERACTION_ERROR' }));
		});

		it('affiche les sous-catégories', async () => {
			mockFindBoard.mockResolvedValue({ _id: 'b1', status: 'open' });
			const i = base('order_cat|b1|resources');
			await cat.execute(i);
			expect(mockCreateSubcategoryRows).toHaveBeenCalledWith('b1', 'resources', expect.anything());
			expect(i.update).toHaveBeenCalledWith(expect.objectContaining({
				content: 'MATERIAL_SELECT_SUBCATEGORY',
			}));
		});

		it('refuse board closed', async () => {
			mockFindBoard.mockResolvedValue({ _id: 'b1', status: 'closed' });
			const i = base('order_cat|b1|resources');
			await cat.execute(i);
			expect(i.reply).toHaveBeenCalledWith(expect.objectContaining({ content: 'ORDER_STATUS_CLOSED' }));
		});
	});

	describe('order_sub', () => {
		it('refuse compound invalide', async () => {
			const i = base('order_sub|b1|resources');
			await sub.execute(i);
			expect(i.reply).toHaveBeenCalledWith(expect.objectContaining({ content: 'INTERACTION_ERROR' }));
		});

		it('refuse customId sans sous-catégorie', async () => {
			const i = base('order_sub|b1');
			await sub.execute(i);
			expect(i.reply).toHaveBeenCalledWith(expect.objectContaining({ content: 'INTERACTION_ERROR' }));
		});

		it('affiche le select matériaux', async () => {
			mockFindBoard.mockResolvedValue({ _id: 'b1', status: 'open' });
			const i = base('order_sub|b1|resources__bmat');
			await sub.execute(i);
			expect(mockGetCamp).toHaveBeenCalledWith('g1');
			expect(mockCreateMaterialSelectRows).toHaveBeenCalledWith(
				'b1', 'resources', 'bmat', 'warden', expect.anything(),
			);
			expect(i.update).toHaveBeenCalledWith(expect.objectContaining({
				content: 'MATERIAL_SELECT_TYPE',
			}));
		});

		it('refuse board manquant', async () => {
			mockFindBoard.mockResolvedValue(null);
			const i = base('order_sub|b1|resources__bmat');
			await sub.execute(i);
			expect(i.reply).toHaveBeenCalledWith(expect.objectContaining({ content: 'ORDER_BOARD_NOT_EXIST' }));
		});
	});

	describe('order_correct', () => {
		it('refuse sans boardId', async () => {
			const i = base('order_correct');
			await correct.execute(i);
			expect(i.reply).toHaveBeenCalledWith(expect.objectContaining({ content: 'INTERACTION_ERROR' }));
		});

		it('refuse sans sélection', async () => {
			mockFindBoard.mockResolvedValue({ _id: 'b1', status: 'open', selected_line_id: null });
			OrderLine.findOne.mockReturnValue({ lean: async () => null });
			const i = base('order_correct|b1');
			await correct.execute(i);
			expect(i.reply).toHaveBeenCalledWith(expect.objectContaining({ content: 'ORDER_NO_SELECTION' }));
		});

		it('ouvre le modal de correction', async () => {
			mockFindBoard.mockResolvedValue({ _id: 'b1', status: 'open', selected_line_id: '3' });
			const i = base('order_correct|b1|3');
			await correct.execute(i);
			expect(i.showModal).toHaveBeenCalled();
			const modal = i.showModal.mock.calls[0][0];
			expect(modal.data.custom_id).toBe('order_correct_modal|b1|3');
		});

		it('utilise des valeurs par défaut si current/target invalides', async () => {
			mockFindBoard.mockResolvedValue({ _id: 'b1', status: 'open', selected_line_id: '3' });
			OrderLine.findOne.mockReturnValue({
				lean: async () => ({ line_id: '3', current: null, target: 0, owner_id: 'u1' }),
			});
			const i = base('order_correct|b1|3');
			await correct.execute(i);
			const modal = i.showModal.mock.calls[0][0];
			const rows = modal.toJSON().components;
			expect(rows[0].components[0].value).toBe('0');
			expect(rows[1].components[0].value).toBe('1');
		});

		it('refuse board closed', async () => {
			mockFindBoard.mockResolvedValue({ _id: 'b1', status: 'closed' });
			const i = base('order_correct|b1|3');
			await correct.execute(i);
			expect(i.reply).toHaveBeenCalledWith(expect.objectContaining({ content: 'ORDER_STATUS_CLOSED' }));
		});
	});

	describe('order_delete_line', () => {
		it('refuse sans permission', async () => {
			canManageLine.mockReturnValue(false);
			mockFindBoard.mockResolvedValue({ _id: 'b1', status: 'open', selected_line_id: '3' });
			const i = base('order_delete_line|b1|3');
			await deleteLine.execute(i);
			expect(mockDeleteLine).not.toHaveBeenCalled();
			expect(i.reply).toHaveBeenCalledWith(expect.objectContaining({
				content: 'ORDER_CANNOT_MANAGE_ERROR',
			}));
		});

		it('supprime la ligne et refresh', async () => {
			const board = { _id: 'b1', status: 'open', selected_line_id: '3' };
			mockFindBoard.mockResolvedValue(board);
			mockDeleteLine.mockResolvedValue({ deletedCount: 1 });
			const i = base('order_delete_line|b1|3');
			await deleteLine.execute(i);
			expect(i.deferUpdate).toHaveBeenCalled();
			expect(mockDeleteLine).toHaveBeenCalledWith('g1', 'b1', '3');
			expect(appendOrderLog).toHaveBeenCalled();
			expect(mockRefresh).toHaveBeenCalledWith(i.client, board, i.channel);
		});

		it('log avec tiret si ligne sans nom', async () => {
			mockFindBoard.mockResolvedValue({ _id: 'b1', status: 'open', selected_line_id: '3' });
			OrderLine.findOne.mockReturnValue({
				lean: async () => ({ line_id: '3', owner_id: 'u1' }),
			});
			mockDeleteLine.mockResolvedValue({ deletedCount: 1 });
			await deleteLine.execute(base('order_delete_line|b1|3'));
			expect(appendOrderLog).toHaveBeenCalled();
		});

		it('followUp si delete échoue', async () => {
			mockFindBoard.mockResolvedValue({ _id: 'b1', status: 'open', selected_line_id: '3' });
			mockDeleteLine.mockResolvedValue({ deletedCount: 0 });
			const i = base('order_delete_line|b1|3');
			await deleteLine.execute(i);
			expect(i.followUp).toHaveBeenCalledWith(expect.objectContaining({
				content: 'ORDER_LINE_NOT_EXIST',
			}));
		});

		it('ignore followUp rejeté si delete échoue', async () => {
			mockFindBoard.mockResolvedValue({ _id: 'b1', status: 'open', selected_line_id: '3' });
			mockDeleteLine.mockResolvedValue({ deletedCount: 0 });
			const i = base('order_delete_line|b1|3');
			i.followUp.mockRejectedValueOnce(new Error('followUp failed'));
			await expect(deleteLine.execute(i)).resolves.toBeUndefined();
		});

		it('refuse sans sélection', async () => {
			mockFindBoard.mockResolvedValue({ _id: 'b1', status: 'open', selected_line_id: null });
			OrderLine.findOne.mockReturnValue({ lean: async () => null });
			const i = base('order_delete_line|b1');
			await deleteLine.execute(i);
			expect(i.reply).toHaveBeenCalledWith(expect.objectContaining({ content: 'ORDER_NO_SELECTION' }));
		});
	});

	describe('order_catalog', () => {
		it('refuse valeurs manquantes', async () => {
			const i = base('order_catalog|b1|resources', { values: [] });
			await catalog.execute(i);
			expect(i.reply).toHaveBeenCalledWith(expect.objectContaining({ content: 'INTERACTION_ERROR' }));
		});

		it('setDraft puis ouvre le modal quantité', async () => {
			const board = { _id: 'b1', status: 'open' };
			mockFindBoard.mockResolvedValue(board);
			const i = base('order_catalog|b1|resources|1', { values: ['Basic Materials'] });
			await catalog.execute(i);
			expect(mockSetDraft).toHaveBeenCalledWith(board, 'u1', {
				name: 'Basic Materials',
				category: 'resources',
			});
			expect(i.showModal).toHaveBeenCalled();
			const modal = i.showModal.mock.calls[0][0];
			expect(modal.data.custom_id).toBe('order_add_modal|b1');
		});

		it('refuse board closed', async () => {
			mockFindBoard.mockResolvedValue({ _id: 'b1', status: 'closed' });
			const i = base('order_catalog|b1|resources|1', { values: ['Basic Materials'] });
			await catalog.execute(i);
			expect(mockSetDraft).not.toHaveBeenCalled();
			expect(i.reply).toHaveBeenCalledWith(expect.objectContaining({ content: 'ORDER_STATUS_CLOSED' }));
		});

		it('refuse board manquant', async () => {
			mockFindBoard.mockResolvedValue(null);
			const i = base('order_catalog|b1|resources|1', { values: ['Basic Materials'] });
			await catalog.execute(i);
			expect(i.reply).toHaveBeenCalledWith(expect.objectContaining({ content: 'ORDER_BOARD_NOT_EXIST' }));
		});
	});

	describe('edges board manquant', () => {
		it('order_cat refuse board manquant', async () => {
			mockFindBoard.mockResolvedValue(null);
			await cat.execute(base('order_cat|b1|resources'));
			expect(mockTranslate).toHaveBeenCalledWith('ORDER_BOARD_NOT_EXIST');
		});

		it('order_sub refuse board closed', async () => {
			mockFindBoard.mockResolvedValue({ _id: 'b1', status: 'closed' });
			await sub.execute(base('order_sub|b1|resources__bmat'));
			expect(mockTranslate).toHaveBeenCalledWith('ORDER_STATUS_CLOSED');
		});

		it('order_correct refuse board manquant', async () => {
			mockFindBoard.mockResolvedValue(null);
			await correct.execute(base('order_correct|b1|3'));
			expect(mockTranslate).toHaveBeenCalledWith('ORDER_BOARD_NOT_EXIST');
		});

		it('order_delete_line refuse board manquant / closed / customId', async () => {
			await deleteLine.execute(base('order_delete_line'));
			expect(mockTranslate).toHaveBeenCalledWith('INTERACTION_ERROR');

			mockFindBoard.mockResolvedValue(null);
			await deleteLine.execute(base('order_delete_line|b1|3'));
			expect(mockTranslate).toHaveBeenCalledWith('ORDER_BOARD_NOT_EXIST');

			mockFindBoard.mockResolvedValue({ _id: 'b1', status: 'closed' });
			await deleteLine.execute(base('order_delete_line|b1|3'));
			expect(mockTranslate).toHaveBeenCalledWith('ORDER_STATUS_CLOSED');
		});
	});
});
