const mockTranslate = jest.fn((key) => key);
const mockGroupFindOne = jest.fn();
const mockMaterialDeleteMany = jest.fn();

jest.mock('../../utils/translations.js', () => jest.fn().mockImplementation(() => ({ translate: mockTranslate })));
jest.mock('../../data/models.js', () => {
	const GroupMock = {
		findOne: jest.fn().mockReturnValue({
			exec: () => mockGroupFindOne(),
		}),
	};
	return {
		Material: { deleteMany: (...args) => mockMaterialDeleteMany(...args) },
		Group: GroupMock,
	};
});

describe('Button logistics close', () => {
	let closeHandler;

	beforeEach(() => {
		jest.clearAllMocks();
		closeHandler = require('../../interactions/buttons/logistics/close.js');
	});

	it('a la structure correcte', () => {
		expect(closeHandler.id).toBe('button_logistics_close');
		expect(typeof closeHandler.execute).toBe('function');
	});

	it('répond THREAD_NOT_EXIST si le thread n\'existe pas', async () => {
		const group = { owner_id: 'user-123' };
		mockGroupFindOne.mockResolvedValue(group);
		const interaction = {
			client: { channels: { cache: new Map() } },
			guild: { id: 'g1', channels: { cache: new Map() } },
			channelId: 'ch-123',
			channel: { parentId: 'parent-1' },
			user: { id: 'user-123' },
			reply: jest.fn().mockResolvedValue(undefined),
		};

		await closeHandler.execute(interaction);

		expect(interaction.reply).toHaveBeenCalledWith({
			content: 'THREAD_NOT_EXIST',
			flags: 64,
		});
	});

	it('répond THREAD_ARE_NO_OWNER_ERROR si l\'utilisateur n\'est pas le propriétaire', async () => {
		const group = { owner_id: 'other-user' };
		mockGroupFindOne.mockResolvedValue(group);
		const mockThread = { id: 'ch-123', delete: jest.fn().mockResolvedValue(undefined) };
		const mockParent = {
			messages: { fetch: jest.fn().mockResolvedValue({ delete: jest.fn().mockResolvedValue(undefined) }) },
		};
		const interaction = {
			client: {
				channels: {
					cache: new Map([['ch-123', mockThread], ['parent-1', mockParent]]),
				},
			},
			guild: { id: 'g1', channels: { cache: new Map([['ch-123', mockThread]]) } },
			channelId: 'ch-123',
			channel: { parentId: 'parent-1' },
			user: { id: 'user-123' },
			reply: jest.fn().mockResolvedValue(undefined),
		};

		await closeHandler.execute(interaction);

		expect(interaction.reply).toHaveBeenCalledWith({
			content: 'THREAD_ARE_NO_OWNER_ERROR',
			flags: 64,
		});
		expect(mockThread.delete).not.toHaveBeenCalled();
	});

	it('supprime les materials, le message et le thread si propriétaire', async () => {
		const group = { owner_id: 'user-123', deleteOne: jest.fn().mockResolvedValue(undefined) };
		mockGroupFindOne.mockResolvedValue(group);
		const mockMsgDelete = jest.fn().mockResolvedValue(undefined);
		const mockThread = { id: 'ch-123', delete: jest.fn().mockResolvedValue(undefined) };
		const mockParent = {
			messages: { fetch: jest.fn().mockResolvedValue({ delete: mockMsgDelete }) },
		};
		mockMaterialDeleteMany.mockResolvedValue({ deletedCount: 5 });

		const interaction = {
			client: {
				channels: {
					cache: new Map([['ch-123', mockThread], ['parent-1', mockParent]]),
				},
			},
			guild: { id: 'g1', channels: { cache: new Map([['ch-123', mockThread]]) } },
			channelId: 'ch-123',
			channel: { parentId: 'parent-1' },
			user: { id: 'user-123' },
			reply: jest.fn().mockResolvedValue(undefined),
		};

		await closeHandler.execute(interaction);

		expect(mockMaterialDeleteMany).toHaveBeenCalledWith({ guild_id: 'g1', group_id: 'ch-123' });
		expect(mockMsgDelete).toHaveBeenCalled();
		expect(mockThread.delete).toHaveBeenCalled();
		expect(group.deleteOne).toHaveBeenCalledWith({ guild_id: 'g1', threadId: 'ch-123' });
	});

	it('répond THREAD_CLOSE_ERROR si Group.findOne échoue', async () => {
		mockGroupFindOne.mockRejectedValue(new Error('DB error'));
		const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
		const interaction = {
			client: { channels: { cache: new Map() } },
			guild: { id: 'g1', channels: { cache: new Map() } },
			channelId: 'ch-123',
			channel: { parentId: 'parent-1' },
			user: { id: 'user-123' },
			reply: jest.fn().mockResolvedValue(undefined),
		};

		await closeHandler.execute(interaction);

		expect(interaction.reply).toHaveBeenCalledWith({
			content: 'THREAD_CLOSE_ERROR',
			flags: 64,
		});
		consoleSpy.mockRestore();
	});
});
