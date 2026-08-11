const mockTranslate = jest.fn((key, params) => (params ? `${key}_${JSON.stringify(params)}` : key));

jest.mock('../../utils/translations.js', () => jest.fn().mockImplementation(() => ({ translate: mockTranslate })));
jest.mock('../../utils/markdown.js', () => ({
	safeEscapeMarkdown: (x) => x,
}));

const createSlash = require('../../interactions/slash/operation/create.js');

describe('Slash /operation', () => {
	function interaction(title) {
		return {
			client: { sessions: {}, traductions: new Map() },
			guild: { id: 'g1' },
			user: { id: 'u1' },
			options: {
				getString: () => title,
			},
			reply: jest.fn().mockResolvedValue(undefined),
			showModal: jest.fn().mockResolvedValue(undefined),
		};
	}

	it('refuse un titre invalide', async () => {
		const i = interaction('BAD$$$');
		await createSlash.execute(i);
		expect(i.reply).toHaveBeenCalledWith(expect.objectContaining({
			content: 'OPERATION_TITLE_FORMAT_ERROR',
		}));
		expect(i.showModal).not.toHaveBeenCalled();
	});

	it('ouvre le modal et stocke le titre en session', async () => {
		const i = interaction('raid');
		await createSlash.execute(i);
		expect(i.client.sessions.u1).toEqual({ title: 'RAID' });
		expect(i.showModal).toHaveBeenCalled();
		const modal = i.showModal.mock.calls[0][0];
		expect(modal.data.custom_id).toBe('modal_create_operation');
	});
});
