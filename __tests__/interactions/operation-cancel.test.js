const mockTranslate = jest.fn((key) => key);

jest.mock('../../utils/translations.js', () => jest.fn().mockImplementation(() => ({ translate: mockTranslate })));

const mockOperationFindOne = jest.fn();
const mockOperationDeleteOne = jest.fn().mockResolvedValue({});
const mockGroupFind = jest.fn();
const mockMaterialDeleteMany = jest.fn().mockResolvedValue({});

jest.mock('../../data/models.js', () => ({
	Operation: {
		findOne: (...args) => mockOperationFindOne(...args),
		deleteOne: (...args) => mockOperationDeleteOne(...args),
	},
	Group: {
		find: (...args) => mockGroupFind(...args),
	},
	Material: {
		deleteMany: (...args) => mockMaterialDeleteMany(...args),
	},
}));

const cancelHandler = require('../../interactions/buttons/operation/cancel.js');

describe('Operation cancel button', () => {
	let interaction;
	let mockThreadDelete;
	let mockGroupDeleteOne;
	let mockThreadsFetch;

	beforeEach(() => {
		jest.clearAllMocks();
		mockThreadDelete = jest.fn().mockResolvedValue(undefined);
		mockGroupDeleteOne = jest.fn().mockResolvedValue(undefined);
		mockThreadsFetch = jest.fn();

		interaction = {
			client: { traductions: new Map() },
			guild: { id: 'guild-1' },
			user: { id: 'owner-1' },
			channel: {
				threads: {
					cache: new Map(),
					fetch: mockThreadsFetch,
				},
			},
			message: { id: 'op-msg-1', delete: jest.fn().mockResolvedValue(undefined) },
			deferReply: jest.fn().mockResolvedValue(undefined),
			editReply: jest.fn().mockResolvedValue(undefined),
		};
	});

	it('supprime le thread via fetch si absent du cache et nettoie le Group', async () => {
		mockOperationFindOne.mockResolvedValue({
			owner_id: 'owner-1',
			title: 'Op Test',
		});
		mockGroupFind.mockResolvedValue([
			{ threadId: 'thread-1', deleteOne: mockGroupDeleteOne },
		]);

		const threadChannel = { id: 'thread-1', delete: mockThreadDelete };
		mockThreadsFetch.mockResolvedValue(threadChannel);

		await cancelHandler.execute(interaction);

		expect(mockThreadsFetch).toHaveBeenCalledWith('thread-1');
		expect(mockMaterialDeleteMany).toHaveBeenCalledWith({ guild_id: 'guild-1', group_id: 'thread-1' });
		expect(mockThreadDelete).toHaveBeenCalled();
		expect(mockGroupDeleteOne).toHaveBeenCalled();
		expect(mockOperationDeleteOne).toHaveBeenCalled();
	});
});
