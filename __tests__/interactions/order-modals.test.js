jest.mock('../../utils/orderBoardLog.js', () => ({
	appendOrderLog: jest.fn().mockResolvedValue(true),
}));

const mockFindBoard = jest.fn();
const mockGetDraft = jest.fn();
const mockConsumeDraft = jest.fn();
const mockCreateLine = jest.fn();
const mockCountLines = jest.fn().mockResolvedValue(0);
const mockCorrectLine = jest.fn();
const mockRefresh = jest.fn().mockResolvedValue(true);

jest.mock('../../services/order/index.js', () => ({
	findBoardById: (...args) => mockFindBoard(...args),
	getDraft: (...args) => mockGetDraft(...args),
	consumeDraft: (...args) => mockConsumeDraft(...args),
	createLine: (...args) => mockCreateLine(...args),
	countLines: (...args) => mockCountLines(...args),
	correctLine: (...args) => mockCorrectLine(...args),
	refreshOrderBoard: (...args) => mockRefresh(...args),
}));

const mockTranslate = jest.fn((key) => key);
jest.mock('../../utils/translations.js', () => jest.fn().mockImplementation(() => ({ translate: mockTranslate })));

const addModal = require('../../interactions/modals/order/add.js');
const correctModal = require('../../interactions/modals/order/correct.js');

describe('Order modals', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		mockCountLines.mockResolvedValue(0);
	});

	function interaction(customId, fields) {
		return {
			client: { traductions: new Map() },
			guild: { id: 'g1' },
			channel: { id: 'c1' },
			user: { id: 'u1' },
			customId,
			fields: {
				getTextInputValue: (id) => fields[id],
			},
			reply: jest.fn().mockResolvedValue(undefined),
			deferReply: jest.fn().mockResolvedValue(undefined),
			editReply: jest.fn().mockResolvedValue(undefined),
			deleteReply: jest.fn().mockResolvedValue(undefined),
		};
	}

	describe('order_add_modal', () => {
		it('crée une ligne depuis le draft', async () => {
			mockFindBoard.mockResolvedValue({ _id: 'b1', guild_id: 'g1', status: 'open' });
			mockCountLines.mockResolvedValue(0);
			mockGetDraft.mockReturnValue({ name: 'Sticky', category: 'utilities' });
			mockConsumeDraft.mockResolvedValue({ name: 'Sticky', category: 'utilities' });
			mockCreateLine.mockResolvedValue({});
			const i = interaction('order_add_modal|b1', { order_target: '20' });
			await addModal.execute(i);
			expect(mockCreateLine).toHaveBeenCalledWith(
				expect.anything(),
				expect.objectContaining({ name: 'Sticky', target: 20, ownerId: 'u1' }),
			);
			expect(mockConsumeDraft).toHaveBeenCalled();
			expect(i.deferReply).toHaveBeenCalledWith({ flags: 64 });
			expect(i.deleteReply).toHaveBeenCalled();
			expect(mockRefresh).toHaveBeenCalled();
		});

		it('refuse si board plein avant de consommer le draft', async () => {
			mockFindBoard.mockResolvedValue({ _id: 'b1', guild_id: 'g1', status: 'open' });
			mockCountLines.mockResolvedValue(50);
			const i = interaction('order_add_modal|b1', { order_target: '20' });
			await addModal.execute(i);
			expect(mockConsumeDraft).not.toHaveBeenCalled();
			expect(mockCreateLine).not.toHaveBeenCalled();
			expect(i.reply).toHaveBeenCalledWith(expect.objectContaining({ content: 'ORDER_FULL' }));
		});

		it('refuse target invalide', async () => {
			const i = interaction('order_add_modal|b1', { order_target: '0' });
			await addModal.execute(i);
			expect(mockCreateLine).not.toHaveBeenCalled();
			expect(i.reply).toHaveBeenCalledWith(expect.objectContaining({ content: 'ORDER_INVALID_TARGET' }));
		});

		it('refuse sans draft', async () => {
			mockFindBoard.mockResolvedValue({ _id: 'b1', status: 'open' });
			mockGetDraft.mockReturnValue(null);
			const i = interaction('order_add_modal|b1', { order_target: '5' });
			await addModal.execute(i);
			expect(i.reply).toHaveBeenCalledWith(expect.objectContaining({ content: 'INTERACTION_ERROR' }));
		});

		it('refuse board closed', async () => {
			mockFindBoard.mockResolvedValue({ _id: 'b1', status: 'closed' });
			const i = interaction('order_add_modal|b1', { order_target: '5' });
			await addModal.execute(i);
			expect(mockCreateLine).not.toHaveBeenCalled();
			expect(i.reply).toHaveBeenCalledWith(expect.objectContaining({ content: 'ORDER_STATUS_CLOSED' }));
		});
	});

	describe('order_correct_modal', () => {
		it('corrige current et target', async () => {
			mockFindBoard.mockResolvedValue({ _id: 'b1', status: 'open' });
			mockCorrectLine.mockResolvedValue({ current: 3, target: 9, name: 'Sticky' });
			const i = interaction('order_correct_modal|b1|2', {
				order_current: '3',
				order_target: '9',
			});
			await correctModal.execute(i);
			expect(mockCorrectLine).toHaveBeenCalledWith('g1', 'b1', '2', { current: 3, target: 9 });
			expect(i.deferReply).toHaveBeenCalled();
			expect(i.deleteReply).toHaveBeenCalled();
		});
	});
});
