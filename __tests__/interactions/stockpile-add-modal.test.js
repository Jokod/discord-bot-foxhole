const mockTranslate = jest.fn((key, params) => {
	if (params?.id != null) return `${key}#${params.id}`;
	return key;
});

jest.mock('../../utils/translations.js', () => jest.fn().mockImplementation(() => ({ translate: mockTranslate })));
jest.mock('../../utils/markdown.js', () => ({ safeEscapeMarkdown: (x) => x }));
jest.mock('../../utils/formatLocation.js', () => ({
	normalizeForDb: (x) => x.toLowerCase(),
	formatForDisplay: (x) => x,
}));
jest.mock('../../utils/notifications.js', () => ({
	sendToSubscribers: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('../../utils/trackedMessage.js', () => ({
	editTrackedOrFallback: jest.fn().mockResolvedValue(undefined),
}));

const mockBuildEmbed = jest.fn();
const mockBuildComponents = jest.fn().mockResolvedValue([]);
jest.mock('../../interactions/embeds/stockpileList.js', () => ({
	buildStockpileListEmbed: (...args) => mockBuildEmbed(...args),
	buildStockpileListComponents: (...args) => mockBuildComponents(...args),
}));

const mockCount = jest.fn();
const mockFind = jest.fn();
const mockCreate = jest.fn().mockResolvedValue({});

jest.mock('../../data/models.js', () => ({
	Stockpile: {
		countDocuments: (...args) => mockCount(...args),
		find: (...args) => mockFind(...args),
		create: (...args) => mockCreate(...args),
	},
	TrackedMessage: {},
}));

const { sendToSubscribers } = require('../../utils/notifications.js');
const { editTrackedOrFallback } = require('../../utils/trackedMessage.js');
const addModal = require('../../interactions/modals/stockpile/add.js');

describe('Modal stockpile add', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		mockCount.mockResolvedValue(0);
		mockFind.mockReturnValue({ lean: async () => [{ id: '2' }, { id: '5' }] });
		mockBuildEmbed.mockResolvedValue({ embed: { toJSON: () => ({}) }, isEmpty: false });
	});

	function interaction(fields, extra = {}) {
		return {
			client: { traductions: new Map(), user: { id: 'bot' } },
			guild: extra.guild === null ? null : { id: 'g1' },
			channelId: 'c1',
			channel: { id: 'c1' },
			user: { id: 'u1' },
			fields: {
				getTextInputValue: (id) => fields[id] ?? '',
			},
			reply: jest.fn().mockResolvedValue(undefined),
			followUp: jest.fn().mockResolvedValue(undefined),
			replied: false,
			deferred: false,
			...extra,
		};
	}

	it('refuse en DM', async () => {
		const i = interaction({}, { guild: null });
		await addModal.execute(i);
		expect(i.reply).toHaveBeenCalledWith(expect.objectContaining({ content: 'NO_DM' }));
	});

	it('refuse champs invalides', async () => {
		const i = interaction({
			stock_region: '  ',
			stock_city: '  ',
			stock_name: 'ab',
			stock_code: '12',
		});
		await addModal.execute(i);
		const content = i.reply.mock.calls[0][0].content;
		expect(content).toContain('STOCKPILE_INVALID_REGION');
		expect(content).toContain('STOCKPILE_INVALID_NAME');
		expect(content).toContain('STOCKPILE_INVALID_PASSWORD');
	});

	it('assigne id 1 si aucun stock existant', async () => {
		mockFind.mockReturnValue({ lean: async () => [] });
		const i = interaction({
			stock_region: 'Basin',
			stock_city: 'Town',
			stock_name: 'Seaport Alpha',
			stock_code: '123456',
		});
		await addModal.execute(i);
		expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({ id: '1' }));
	});

	it('ignore les ids non numériques pour le max', async () => {
		mockFind.mockReturnValue({ lean: async () => [{ id: 'x' }, { id: '2' }] });
		const i = interaction({
			stock_region: 'Basin',
			stock_city: 'Town',
			stock_name: 'Seaport Alpha',
			stock_code: '123456',
		});
		await addModal.execute(i);
		expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({ id: '3' }));
	});

	it('refuse si max atteint', async () => {
		mockCount.mockResolvedValue(15);
		const i = interaction({
			stock_region: 'Basin',
			stock_city: 'Town',
			stock_name: 'Seaport Alpha',
			stock_code: '123 456',
		});
		await addModal.execute(i);
		expect(mockCreate).not.toHaveBeenCalled();
		expect(i.reply).toHaveBeenCalledWith(expect.objectContaining({
			content: 'STOCKPILE_MAX_REACHED',
		}));
	});

	it('crée le stock et met à jour la liste', async () => {
		const i = interaction({
			stock_region: 'Basin',
			stock_city: 'Town',
			stock_name: 'Seaport Alpha',
			stock_code: '123 456',
		});
		await addModal.execute(i);
		expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({
			id: '6',
			server_id: 'g1',
			name: 'Seaport Alpha',
			password: '123456',
			owner_id: 'u1',
		}));
		expect(i.reply).toHaveBeenCalledWith(expect.objectContaining({
			content: 'STOCKPILE_CREATE_SUCCESS#6',
		}));
		expect(sendToSubscribers).toHaveBeenCalled();
		const factory = sendToSubscribers.mock.calls[0][3];
		expect(factory({ translate: mockTranslate }).content).toContain('NOTIFICATION_STOCKPILE_ADDED');
		expect(editTrackedOrFallback).toHaveBeenCalled();
	});

	it('met à jour liste vide après création', async () => {
		mockBuildEmbed.mockResolvedValue({ embed: null, isEmpty: true });
		const i = interaction({
			stock_region: 'Basin',
			stock_city: 'Town',
			stock_name: 'Seaport Alpha',
			stock_code: '123456',
		});
		await addModal.execute(i);
		expect(editTrackedOrFallback).toHaveBeenCalledWith(expect.objectContaining({
			editPayload: expect.objectContaining({ content: 'STOCKPILE_LIST_EMPTY' }),
		}));
	});

	it('répond CREATE_ERROR si create échoue', async () => {
		mockCreate.mockRejectedValueOnce(new Error('db'));
		const err = jest.spyOn(console, 'error').mockImplementation(() => undefined);
		const i = interaction({
			stock_region: 'Basin',
			stock_city: 'Town',
			stock_name: 'Seaport Alpha',
			stock_code: '123456',
		});
		await addModal.execute(i);
		err.mockRestore();
		expect(i.reply).toHaveBeenCalledWith(expect.objectContaining({
			content: 'STOCKPILE_CREATE_ERROR',
		}));
	});

	it('met à jour embed + composants si liste non vide', async () => {
		const fakeEmbed = { toJSON: () => ({ title: 'List' }) };
		mockBuildEmbed.mockResolvedValue({ embed: fakeEmbed, isEmpty: false });
		mockBuildComponents.mockResolvedValue([{ fake: 'row' }]);
		const i = interaction({
			stock_region: 'Basin',
			stock_city: 'Town',
			stock_name: 'Seaport Alpha',
			stock_code: '123456',
		});
		await addModal.execute(i);
		expect(mockBuildComponents).toHaveBeenCalled();
		expect(editTrackedOrFallback).toHaveBeenCalledWith(expect.objectContaining({
			editPayload: expect.objectContaining({ embeds: [fakeEmbed] }),
		}));
	});

	it('ignore sendToSubscribers rejeté', async () => {
		sendToSubscribers.mockRejectedValueOnce(new Error('notify failed'));
		const i = interaction({
			stock_region: 'Basin',
			stock_city: 'Town',
			stock_name: 'Seaport Alpha',
			stock_code: '123456',
		});
		await expect(addModal.execute(i)).resolves.toBeUndefined();
	});

	it('exécute fallbackMatcher et fallbackSend liste vide', async () => {
		mockBuildEmbed.mockResolvedValue({ embed: null, isEmpty: true });
		const i = interaction({
			stock_region: 'Basin',
			stock_city: 'Town',
			stock_name: 'Seaport Alpha',
			stock_code: '123456',
		});
		await addModal.execute(i);
		const opts = editTrackedOrFallback.mock.calls[0][0];
		expect(opts.fallbackMatcher([{
			author: { id: 'bot' },
			embeds: [{ title: '🔑 STOCKPILE_LIST_CODES' }],
		}])).toBeTruthy();
		await opts.fallbackSend();
		expect(i.followUp).toHaveBeenCalledWith(expect.objectContaining({
			content: 'STOCKPILE_LIST_EMPTY',
		}));
	});

	it('exécute fallbackSend liste non vide', async () => {
		const fakeEmbed = { toJSON: () => ({ title: 'List' }) };
		mockBuildEmbed.mockResolvedValue({ embed: fakeEmbed, isEmpty: false });
		mockBuildComponents.mockResolvedValue([]);
		const i = interaction({
			stock_region: 'Basin',
			stock_city: 'Town',
			stock_name: 'Seaport Alpha',
			stock_code: '123456',
		});
		await addModal.execute(i);
		const opts = editTrackedOrFallback.mock.calls[0][0];
		await opts.fallbackSend();
		expect(i.followUp).toHaveBeenCalledWith(expect.objectContaining({
			embeds: [fakeEmbed],
		}));
	});

	it('exécute fallbackMatcher sans correspondance', async () => {
		mockBuildEmbed.mockResolvedValue({ embed: null, isEmpty: true });
		const i = interaction({
			stock_region: 'Basin',
			stock_city: 'Town',
			stock_name: 'Seaport Alpha',
			stock_code: '123456',
		});
		await addModal.execute(i);
		const opts = editTrackedOrFallback.mock.calls[0][0];
		expect(opts.fallbackMatcher([{
			author: { id: 'other-bot' },
			embeds: [{ title: 'wrong' }],
		}])).toBeNull();
	});

	it('trim les champs avant validation', async () => {
		const i = interaction({
			stock_region: '  Basin  ',
			stock_city: '  Town  ',
			stock_name: '  Seaport Alpha  ',
			stock_code: ' 123456 ',
		});
		await addModal.execute(i);
		expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({
			name: 'Seaport Alpha',
			password: '123456',
		}));
	});

	it('traite les champs absents comme vides', async () => {
		const i = {
			client: { traductions: new Map(), user: { id: 'bot' } },
			guild: { id: 'g1' },
			channelId: 'c1',
			channel: { id: 'c1' },
			user: { id: 'u1' },
			fields: { getTextInputValue: () => undefined },
			reply: jest.fn().mockResolvedValue(undefined),
			followUp: jest.fn().mockResolvedValue(undefined),
			replied: false,
			deferred: false,
		};
		await addModal.execute(i);
		expect(i.reply).toHaveBeenCalledWith(expect.objectContaining({ flags: 64 }));
	});

	it('followUp CREATE_ERROR si déjà replied', async () => {
		mockCreate.mockRejectedValueOnce(new Error('db'));
		const err = jest.spyOn(console, 'error').mockImplementation(() => undefined);
		const i = interaction({
			stock_region: 'Basin',
			stock_city: 'Town',
			stock_name: 'Seaport Alpha',
			stock_code: '123456',
		}, { replied: true });
		await addModal.execute(i);
		err.mockRestore();
		expect(i.followUp).toHaveBeenCalledWith(expect.objectContaining({
			content: 'STOCKPILE_CREATE_ERROR',
		}));
	});
});
