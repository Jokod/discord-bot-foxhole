const mockTranslate = jest.fn((key, params) => (params ? `${key}_${JSON.stringify(params)}` : key));

jest.mock('../../utils/translations.js', () => jest.fn().mockImplementation(() => ({ translate: mockTranslate })));
jest.mock('../../utils/markdown.js', () => ({
	safeEscapeMarkdown: (x) => x,
}));

const mockFindOne = jest.fn();
const mockUpdateOne = jest.fn().mockResolvedValue({});

jest.mock('../../data/models.js', () => ({
	Operation: {
		findOne: (...args) => mockFindOne(...args),
		updateOne: (...args) => mockUpdateOne(...args),
	},
}));

const startHandler = require('../../interactions/buttons/operation/start.js');

describe('Operation start button', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	function base(extra = {}) {
		return {
			client: { traductions: new Map() },
			guild: { id: 'guild-1' },
			user: { id: 'owner-1' },
			message: { id: 'op-msg-1' },
			update: jest.fn().mockResolvedValue(undefined),
			reply: jest.fn().mockResolvedValue(undefined),
			...extra,
		};
	}

	it('refuse opération introuvable', async () => {
		mockFindOne.mockResolvedValue(null);
		const i = base();
		await startHandler.execute(i);
		expect(i.reply).toHaveBeenCalledWith(expect.objectContaining({
			content: 'OPERATION_NOT_EXIST',
		}));
	});

	it('refuse si pas owner', async () => {
		mockFindOne.mockResolvedValue({ owner_id: 'other', title: 'Op' });
		const i = base();
		await startHandler.execute(i);
		expect(i.reply).toHaveBeenCalledWith(expect.objectContaining({
			content: 'OPERATION_ARE_NO_OWNER_ERROR',
		}));
	});

	it('démarre l’opération et remplace les boutons', async () => {
		mockFindOne.mockResolvedValue({
			owner_id: 'owner-1',
			title: 'Op Test',
			date: '01/01/2026',
			time: '20:00',
			duration: 60,
			description: 'Raid',
		});
		const i = base();
		await startHandler.execute(i);
		expect(mockUpdateOne).toHaveBeenCalledWith(
			{ guild_id: 'guild-1', operation_id: 'op-msg-1' },
			{ status: 'started' },
		);
		expect(i.update).toHaveBeenCalledWith(expect.objectContaining({
			content: expect.stringContaining('OPERATION_LAUNCH_SUCCESS'),
			components: expect.any(Array),
		}));
		const row = i.update.mock.calls[0][0].components[0];
		expect(row.components.map((b) => b.data.custom_id)).toEqual([
			'button_create_operation_finished',
			'button_create_operation_cancel',
		]);
	});

	it('répond OPERATION_LAUNCH_ERROR en cas d’exception', async () => {
		mockFindOne.mockRejectedValue(new Error('db'));
		const i = base();
		const err = jest.spyOn(console, 'error').mockImplementation(() => undefined);
		await startHandler.execute(i);
		err.mockRestore();
		expect(i.reply).toHaveBeenCalledWith(expect.objectContaining({
			content: 'OPERATION_LAUNCH_ERROR',
		}));
	});
});
