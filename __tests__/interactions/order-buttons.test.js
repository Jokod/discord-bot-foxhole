const mockTranslate = jest.fn((key) => key);
jest.mock('../../utils/translations.js', () => jest.fn().mockImplementation(() => ({ translate: mockTranslate })));

const mockFindBoard = jest.fn();
const mockApplyIncrement = jest.fn();
const mockFillToTarget = jest.fn();
const mockCloseBoard = jest.fn();
const mockReopenBoard = jest.fn();
const mockListLines = jest.fn();
const mockCountLines = jest.fn().mockResolvedValue(0);
const mockCyclePriority = jest.fn();
const mockSetSelected = jest.fn();
const mockRefresh = jest.fn().mockResolvedValue(true);
const mockRefreshDebounced = jest.fn().mockResolvedValue(true);

jest.mock('../../services/order/index.js', () => ({
	QTY_DELTAS: { m1: -1, p1: 1, p4: 4, p9: 9 },
	findBoardById: (...args) => mockFindBoard(...args),
	applyIncrement: (...args) => mockApplyIncrement(...args),
	fillToTarget: (...args) => mockFillToTarget(...args),
	closeBoard: (...args) => mockCloseBoard(...args),
	reopenBoard: (...args) => mockReopenBoard(...args),
	listLines: (...args) => mockListLines(...args),
	countLines: (...args) => mockCountLines(...args),
	cycleLinePriority: (...args) => mockCyclePriority(...args),
	setSelectedLine: (...args) => mockSetSelected(...args),
	refreshOrderBoard: (...args) => mockRefresh(...args),
	refreshOrderBoardDebounced: (...args) => mockRefreshDebounced(...args),
}));

jest.mock('../../utils/order-permissions.js', () => ({
	canManageBoard: jest.fn(() => true),
	canManageLine: jest.fn(() => true),
}));

jest.mock('../../utils/stockCatalog.js', () => ({
	createCategoryRows: jest.fn(() => [{ fake: 'row' }]),
}));

jest.mock('../../data/models.js', () => ({
	OrderLine: {
		find: jest.fn(() => ({ lean: async () => [] })),
		findOne: jest.fn(() => ({ lean: async () => null, sort: () => ({ lean: async () => null }) })),
	},
}));

jest.mock('../../utils/orderBoardLog.js', () => ({
	appendOrderLog: jest.fn().mockResolvedValue(true),
}));

const qty = require('../../interactions/buttons/order/qty.js');
const close = require('../../interactions/buttons/order/close.js');
const reopen = require('../../interactions/buttons/order/reopen.js');
const add = require('../../interactions/buttons/order/add.js');
const priority = require('../../interactions/buttons/order/priority.js');
const selectLine = require('../../interactions/select-menus/order/select_line.js');
const { canManageBoard, canManageLine } = require('../../utils/order-permissions.js');
const { OrderLine } = require('../../data/models.js');
const { appendOrderLog } = require('../../utils/orderBoardLog.js');

describe('Order buttons', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		canManageBoard.mockReturnValue(true);
		canManageLine.mockReturnValue(true);
		OrderLine.find.mockReturnValue({ lean: async () => [] });
		OrderLine.findOne.mockReturnValue({
			lean: async () => ({ line_id: '3', name: 'Sticky', owner_id: 'u1' }),
			sort: () => ({ lean: async () => ({ line_id: '3' }) }),
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

	describe('order_qty', () => {
		it('incrémente la ligne sélectionnée', async () => {
			mockFindBoard.mockResolvedValue({ _id: 'b1', status: 'open', selected_line_id: '3' });
			mockApplyIncrement.mockResolvedValue({
				line: { name: 'Sticky', current: 5 },
				previous: 1,
				current: 5,
			});
			const i = base('order_qty|p4|b1|3');
			await qty.execute(i);
			expect(mockApplyIncrement).toHaveBeenCalledWith('g1', 'b1', '3', 4);
			expect(appendOrderLog).toHaveBeenCalled();
			expect(i.deferUpdate).toHaveBeenCalled();
			expect(mockRefreshDebounced).toHaveBeenCalled();
		});

		it('décrémente avec -1', async () => {
			mockFindBoard.mockResolvedValue({ _id: 'b1', status: 'open', selected_line_id: '3' });
			mockApplyIncrement.mockResolvedValue({
				line: { name: 'Sticky', current: 2 },
				previous: 3,
				current: 2,
			});
			const i = base('order_qty|m1|b1|3');
			await qty.execute(i);
			expect(mockApplyIncrement).toHaveBeenCalledWith('g1', 'b1', '3', -1);
		});

		it('Max remplit jusqu\'à l\'objectif', async () => {
			mockFindBoard.mockResolvedValue({ _id: 'b1', status: 'open', selected_line_id: '3' });
			mockFillToTarget.mockResolvedValue({
				line: { current: 100, target: 100 },
				previous: 12,
				current: 100,
			});
			const i = base('order_qty|max|b1|3');
			await qty.execute(i);
			expect(mockFillToTarget).toHaveBeenCalledWith('g1', 'b1', '3');
			expect(mockApplyIncrement).not.toHaveBeenCalled();
			expect(appendOrderLog).toHaveBeenCalled();
		});

		it('refuse board closed', async () => {
			mockFindBoard.mockResolvedValue({ _id: 'b1', status: 'closed' });
			const i = base('order_qty|p1|b1|3');
			await qty.execute(i);
			expect(mockApplyIncrement).not.toHaveBeenCalled();
			expect(i.reply).toHaveBeenCalledWith(expect.objectContaining({ content: 'ORDER_STATUS_CLOSED' }));
		});

		it('refuse customId invalide', async () => {
			const i = base('order_qty|xx|b1');
			await qty.execute(i);
			expect(i.reply).toHaveBeenCalledWith(expect.objectContaining({ content: 'INTERACTION_ERROR' }));
		});

		it('refuse board manquant', async () => {
			mockFindBoard.mockResolvedValue(null);
			const i = base('order_qty|p1|b1|3');
			await qty.execute(i);
			expect(i.reply).toHaveBeenCalledWith(expect.objectContaining({ content: 'ORDER_BOARD_NOT_EXIST' }));
		});

		it('utilise la première ligne si aucune sélection', async () => {
			mockFindBoard.mockResolvedValue({ _id: 'b1', status: 'open', selected_line_id: null });
			OrderLine.findOne.mockReturnValue({
				sort: () => ({ lean: async () => ({ line_id: '1' }) }),
			});
			mockApplyIncrement.mockResolvedValue({
				line: { name: 'Bmats', current: 2 },
				previous: 1,
				current: 2,
			});
			const i = base('order_qty|p1|b1|0');
			await qty.execute(i);
			expect(mockApplyIncrement).toHaveBeenCalledWith('g1', 'b1', '1', 1);
		});

		it('refuse sans ligne disponible', async () => {
			mockFindBoard.mockResolvedValue({ _id: 'b1', status: 'open', selected_line_id: null });
			OrderLine.findOne.mockReturnValue({
				sort: () => ({ lean: async () => null }),
			});
			const i = base('order_qty|p1|b1');
			await qty.execute(i);
			expect(i.reply).toHaveBeenCalledWith(expect.objectContaining({ content: 'ORDER_NO_SELECTION' }));
		});

		it('followUp si ligne introuvable après increment', async () => {
			mockFindBoard.mockResolvedValue({ _id: 'b1', status: 'open', selected_line_id: '3' });
			mockApplyIncrement.mockResolvedValue(null);
			const i = base('order_qty|p1|b1|3');
			await qty.execute(i);
			expect(i.followUp).toHaveBeenCalledWith(expect.objectContaining({
				content: 'ORDER_LINE_NOT_EXIST',
			}));
		});

		it('ignore le log si quantité inchangée', async () => {
			mockFindBoard.mockResolvedValue({ _id: 'b1', status: 'open', selected_line_id: '3' });
			mockApplyIncrement.mockResolvedValue({
				line: { name: 'Sticky', current: 5 },
				previous: 5,
				current: 5,
			});
			const i = base('order_qty|p1|b1|3');
			await qty.execute(i);
			expect(appendOrderLog).not.toHaveBeenCalled();
		});

		it('ignore followUp rejeté si ligne introuvable', async () => {
			mockFindBoard.mockResolvedValue({ _id: 'b1', status: 'open', selected_line_id: '3' });
			mockApplyIncrement.mockResolvedValue(null);
			const i = base('order_qty|p1|b1|3');
			i.followUp.mockRejectedValueOnce(new Error('followUp failed'));
			await expect(qty.execute(i)).resolves.toBeUndefined();
		});
	});

	describe('order_priority', () => {
		it('cycle la priorité de la sélection', async () => {
			mockFindBoard.mockResolvedValue({ _id: 'b1', status: 'open', selected_line_id: '2' });
			OrderLine.findOne.mockReturnValue({
				lean: async () => ({ line_id: '2', name: 'Bmats', priority: 'neutral', owner_id: 'u1' }),
			});
			mockCyclePriority.mockResolvedValue({
				line: { name: 'Bmats' },
				previous: 'neutral',
				priority: 'high',
			});
			const i = base('order_priority|b1|2');
			await priority.execute(i);
			expect(mockCyclePriority).toHaveBeenCalledWith('g1', 'b1', '2');
			expect(mockRefreshDebounced).toHaveBeenCalled();
		});

		it('refuse customId / board / closed / sans sélection / cycle échoué', async () => {
			await priority.execute(base('order_priority'));
			expect(mockTranslate).toHaveBeenCalledWith('INTERACTION_ERROR');

			mockFindBoard.mockResolvedValue(null);
			await priority.execute(base('order_priority|b1|2'));
			expect(mockTranslate).toHaveBeenCalledWith('ORDER_BOARD_NOT_EXIST');

			mockFindBoard.mockResolvedValue({ _id: 'b1', status: 'closed' });
			await priority.execute(base('order_priority|b1|2'));
			expect(mockTranslate).toHaveBeenCalledWith('ORDER_STATUS_CLOSED');

			mockFindBoard.mockResolvedValue({ _id: 'b1', status: 'open', selected_line_id: null });
			OrderLine.findOne.mockReturnValue({ lean: async () => null });
			await priority.execute(base('order_priority|b1'));
			expect(mockTranslate).toHaveBeenCalledWith('ORDER_NO_SELECTION');

			mockFindBoard.mockResolvedValue({ _id: 'b1', status: 'open', selected_line_id: '2' });
			OrderLine.findOne.mockReturnValue({
				lean: async () => ({ line_id: '2', name: 'Bmats', owner_id: 'u1' }),
			});
			mockCyclePriority.mockResolvedValue(null);
			const i = base('order_priority|b1|2');
			i.followUp.mockRejectedValueOnce(new Error('followUp failed'));
			await expect(priority.execute(i)).resolves.toBeUndefined();
		});

		it('cycle avec ligne sans nom', async () => {
			mockFindBoard.mockResolvedValue({ _id: 'b1', status: 'open', selected_line_id: '2' });
			OrderLine.findOne.mockReturnValue({
				lean: async () => ({ line_id: '2', owner_id: 'u1' }),
			});
			mockCyclePriority.mockResolvedValue({
				line: {},
				previous: 'neutral',
				priority: 'high',
			});
			await priority.execute(base('order_priority|b1|2'));
			expect(appendOrderLog).toHaveBeenCalled();
		});
	});

	describe('order_select', () => {
		it('met à jour selected_line_id', async () => {
			const board = { _id: 'b1', status: 'open' };
			mockFindBoard.mockResolvedValue(board);
			mockSetSelected.mockResolvedValue(board);
			const i = base('order_select|b1', { values: ['7'] });
			await selectLine.execute(i);
			expect(mockSetSelected).toHaveBeenCalledWith(board, '7');
			expect(mockRefresh).toHaveBeenCalled();
		});

		it('refuse customId / board / closed', async () => {
			await selectLine.execute(base('order_select|b1'));
			expect(mockTranslate).toHaveBeenCalledWith('INTERACTION_ERROR');

			mockFindBoard.mockResolvedValue(null);
			await selectLine.execute(base('order_select|b1', { values: ['1'] }));
			expect(mockTranslate).toHaveBeenCalledWith('ORDER_BOARD_NOT_EXIST');

			mockFindBoard.mockResolvedValue({ _id: 'b1', status: 'closed' });
			await selectLine.execute(base('order_select|b1', { values: ['1'] }));
			expect(mockTranslate).toHaveBeenCalledWith('ORDER_STATUS_CLOSED');
		});
	});

	describe('order_close', () => {
		it('clôture le board', async () => {
			const board = { _id: 'b1', status: 'open', owner_id: 'u1' };
			mockFindBoard.mockResolvedValue(board);
			mockCloseBoard.mockResolvedValue(board);
			const i = base('order_close|b1');
			await close.execute(i);
			expect(mockCloseBoard).toHaveBeenCalledWith(board);
			expect(mockRefresh).toHaveBeenCalled();
		});

		it('refuse sans permission', async () => {
			canManageBoard.mockReturnValue(false);
			mockFindBoard.mockResolvedValue({ _id: 'b1', owner_id: 'other' });
			const i = base('order_close|b1');
			await close.execute(i);
			expect(mockCloseBoard).not.toHaveBeenCalled();
			expect(i.reply).toHaveBeenCalledWith(expect.objectContaining({
				content: 'ORDER_CANNOT_MANAGE_ERROR',
			}));
		});

		it('refuse customId / board manquant', async () => {
			await close.execute(base('order_close'));
			expect(mockTranslate).toHaveBeenCalledWith('INTERACTION_ERROR');

			mockFindBoard.mockResolvedValue(null);
			await close.execute(base('order_close|b1'));
			expect(mockTranslate).toHaveBeenCalledWith('ORDER_BOARD_NOT_EXIST');
		});
	});

	describe('order_reopen', () => {
		it('rouvre le board', async () => {
			const board = { _id: 'b1', status: 'closed', owner_id: 'u1' };
			mockFindBoard.mockResolvedValue(board);
			mockReopenBoard.mockResolvedValue(board);
			const i = base('order_reopen|b1');
			await reopen.execute(i);
			expect(mockReopenBoard).toHaveBeenCalledWith(board);
			expect(appendOrderLog).toHaveBeenCalled();
			expect(mockRefresh).toHaveBeenCalled();
		});

		it('refuse si déjà ouvert', async () => {
			mockFindBoard.mockResolvedValue({ _id: 'b1', status: 'open', owner_id: 'u1' });
			const i = base('order_reopen|b1');
			await reopen.execute(i);
			expect(mockReopenBoard).not.toHaveBeenCalled();
			expect(i.reply).toHaveBeenCalledWith(expect.objectContaining({
				content: 'ORDER_STATUS_ALREADY_OPEN',
			}));
		});

		it('refuse sans permission', async () => {
			canManageBoard.mockReturnValue(false);
			mockFindBoard.mockResolvedValue({ _id: 'b1', status: 'closed', owner_id: 'other' });
			const i = base('order_reopen|b1');
			await reopen.execute(i);
			expect(mockReopenBoard).not.toHaveBeenCalled();
			expect(i.reply).toHaveBeenCalledWith(expect.objectContaining({
				content: 'ORDER_CANNOT_MANAGE_ERROR',
			}));
		});

		it('refuse customId / board manquant', async () => {
			await reopen.execute(base('order_reopen'));
			expect(mockTranslate).toHaveBeenCalledWith('INTERACTION_ERROR');

			mockFindBoard.mockResolvedValue(null);
			await reopen.execute(base('order_reopen|b1'));
			expect(mockTranslate).toHaveBeenCalledWith('ORDER_BOARD_NOT_EXIST');
		});
	});

	describe('order_add', () => {
		it('affiche les catégories', async () => {
			mockFindBoard.mockResolvedValue({ _id: 'b1', status: 'open' });
			mockCountLines.mockResolvedValue(0);
			const i = base('order_add|b1');
			await add.execute(i);
			expect(i.reply).toHaveBeenCalledWith(expect.objectContaining({
				content: 'MATERIAL_SELECT_CATEGORY',
				flags: 64,
			}));
		});

		it('refuse si board plein', async () => {
			mockFindBoard.mockResolvedValue({ _id: 'b1', status: 'open' });
			mockCountLines.mockResolvedValue(50);
			const i = base('order_add|b1');
			await add.execute(i);
			expect(i.reply).toHaveBeenCalledWith(expect.objectContaining({
				content: 'ORDER_FULL',
				flags: 64,
			}));
		});

		it('refuse customId / board manquant / closed', async () => {
			await add.execute(base('order_add'));
			expect(mockTranslate).toHaveBeenCalledWith('INTERACTION_ERROR');

			mockFindBoard.mockResolvedValue(null);
			await add.execute(base('order_add|b1'));
			expect(mockTranslate).toHaveBeenCalledWith('ORDER_BOARD_NOT_EXIST');

			mockFindBoard.mockResolvedValue({ _id: 'b1', status: 'closed' });
			await add.execute(base('order_add|b1'));
			expect(mockTranslate).toHaveBeenCalledWith('ORDER_STATUS_CLOSED');
		});
	});
});
