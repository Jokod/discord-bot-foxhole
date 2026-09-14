const mockTranslate = jest.fn((key, params) => {
	if (params?.id != null) return `${key}#${params.id}`;
	if (params?.max != null) return `${key}:${params.max}`;
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

const mockBuildStockpileListPayload = jest.fn();
jest.mock('../../interactions/embeds/stockpileList.js', () => ({
	buildStockpileListPayload: (...args) => mockBuildStockpileListPayload(...args),
}));

const mockCount = jest.fn();
const mockFind = jest.fn();
const mockCreate = jest.fn().mockResolvedValue({ _id: 'created1' });
const mockDeleteOne = jest.fn().mockResolvedValue({ deletedCount: 1 });

jest.mock('../../data/models.js', () => ({
	Stockpile: {
		countDocuments: (...args) => mockCount(...args),
		find: (...args) => mockFind(...args),
		create: (...args) => mockCreate(...args),
		deleteOne: (...args) => mockDeleteOne(...args),
	},
	TrackedMessage: {},
}));

const { sendToSubscribers } = require('../../utils/notifications.js');
const { editTrackedOrFallback } = require('../../utils/trackedMessage.js');
const addModal = require('../../interactions/modals/stockpile/add.js');

const { v2Text, getV2Text, MessageFlags } = require('../helpers/v2Payload.js');

describe('Modal stockpile add', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		mockCount.mockResolvedValue(0);
		mockFind.mockReturnValue({ lean: async () => [{ id: '2' }, { id: '5' }] });
		mockBuildStockpileListPayload.mockResolvedValue(v2Text('list body'));
		mockCreate.mockResolvedValue({ _id: 'created1' });
	});

	function interaction(fields, extra = {}) {
		return {
			client: { traductions: new Map(), user: { id: 'bot' } },
			guild: extra.guild === null ? null : { id: 'g1' },
			channelId: 'c1',
			channel: {
				id: 'c1',
				send: jest.fn().mockResolvedValue({ id: 'new-list' }),
			},
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
		expect(i.reply).toHaveBeenCalledWith(v2Text('NO_DM', { ephemeral: true }));
	});

	it('refuse champs invalides', async () => {
		const i = interaction({
			stock_region: '  ',
			stock_city: '  ',
			stock_name: 'ab',
			stock_code: '12',
		});
		await addModal.execute(i);
		const content = getV2Text(i.reply.mock.calls[0][0]);
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
		expect(i.reply).toHaveBeenCalledWith(v2Text('STOCKPILE_MAX_REACHED:15', { ephemeral: true }));
	});

	it('rollback et DISPLAY_UPDATE_FAILED si edit Discord échoue', async () => {
		const err = new Error('Invalid Form Body');
		err.code = 50035;
		editTrackedOrFallback.mockRejectedValueOnce(err);
		mockDeleteOne.mockRejectedValueOnce(new Error('delete fail'));
		const i = interaction({
			stock_region: 'Basin',
			stock_city: 'Town',
			stock_name: 'Seaport Alpha',
			stock_code: '123456',
		});
		await addModal.execute(i);
		expect(mockCreate).toHaveBeenCalled();
		expect(mockDeleteOne).toHaveBeenCalledWith({ _id: 'created1' });
		expect(i.reply).toHaveBeenCalledWith(v2Text('DISPLAY_UPDATE_FAILED', { ephemeral: true }));
		expect(sendToSubscribers).not.toHaveBeenCalled();
	});

	it('CREATE_ERROR si edit échoue pour une autre raison', async () => {
		editTrackedOrFallback.mockRejectedValueOnce(new Error('weird'));
		const err = jest.spyOn(console, 'error').mockImplementation(() => undefined);
		const i = interaction({
			stock_region: 'Basin',
			stock_city: 'Town',
			stock_name: 'Seaport Alpha',
			stock_code: '123456',
		});
		await addModal.execute(i);
		err.mockRestore();
		expect(i.reply).toHaveBeenCalledWith(v2Text('STOCKPILE_CREATE_ERROR', { ephemeral: true }));
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
			region: 'basin',
			city: 'town',
			owner_id: 'u1',
		}));
		expect(editTrackedOrFallback).toHaveBeenCalled();
		expect(i.reply).toHaveBeenCalledWith(v2Text('STOCKPILE_CREATE_SUCCESS#6', { ephemeral: true }));
		expect(sendToSubscribers).toHaveBeenCalled();
		const factory = sendToSubscribers.mock.calls[0][3];
		expect(getV2Text(factory({ translate: mockTranslate }))).toContain('NOTIFICATION_STOCKPILE_ADDED');
	});

	it('met à jour liste vide après création', async () => {
		mockBuildStockpileListPayload.mockResolvedValue(v2Text('STOCKPILE_LIST_EMPTY'));
		const i = interaction({
			stock_region: 'Basin',
			stock_city: 'Town',
			stock_name: 'Seaport Alpha',
			stock_code: '123456',
		});
		await addModal.execute(i);
		expect(editTrackedOrFallback).toHaveBeenCalledWith(expect.objectContaining({
			editPayload: v2Text('STOCKPILE_LIST_EMPTY'),
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
		expect(i.reply).toHaveBeenCalledWith(v2Text('STOCKPILE_CREATE_ERROR', { ephemeral: true }));
	});

	it('met à jour payload V2 si liste non vide', async () => {
		const payload = {
			flags: MessageFlags.IsComponentsV2,
			components: [{ toJSON: () => ({ type: 10, content: 'List' }) }],
		};
		mockBuildStockpileListPayload.mockResolvedValue(payload);
		const i = interaction({
			stock_region: 'Basin',
			stock_city: 'Town',
			stock_name: 'Seaport Alpha',
			stock_code: '123456',
		});
		await addModal.execute(i);
		expect(mockBuildStockpileListPayload).toHaveBeenCalled();
		expect(editTrackedOrFallback).toHaveBeenCalledWith(expect.objectContaining({
			editPayload: payload,
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
		mockBuildStockpileListPayload.mockResolvedValue(v2Text('STOCKPILE_LIST_EMPTY'));
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
		expect(i.channel.send).toHaveBeenCalled();
	});

	it('exécute fallbackSend liste non vide', async () => {
		const payload = {
			flags: MessageFlags.IsComponentsV2,
			components: [{ toJSON: () => ({ type: 10, content: 'List' }) }],
		};
		mockBuildStockpileListPayload.mockResolvedValue(payload);
		const i = interaction({
			stock_region: 'Basin',
			stock_city: 'Town',
			stock_name: 'Seaport Alpha',
			stock_code: '123456',
		});
		await addModal.execute(i);
		const opts = editTrackedOrFallback.mock.calls[0][0];
		await opts.fallbackSend();
		expect(i.channel.send).toHaveBeenCalled();
	});

	it('exécute fallbackMatcher V2 par contenu des components', async () => {
		mockBuildStockpileListPayload.mockResolvedValue(v2Text('STOCKPILE_LIST_EMPTY'));
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
			embeds: [],
			flags: { has: (f) => f === MessageFlags.IsComponentsV2 },
			components: [{ content: '🔑 STOCKPILE_LIST_CODES' }],
		}])).toBeTruthy();
		expect(opts.fallbackMatcher([{
			author: { id: 'bot' },
			embeds: [],
			flags: { has: (f) => f === MessageFlags.IsComponentsV2 },
			components: null,
		}])).toBeNull();
		expect(opts.fallbackMatcher([{
			author: { id: 'bot' },
			embeds: [{ title: 'nope' }],
			flags: { has: () => false },
		}])).toBeNull();
	});

	it('exécute fallbackMatcher sans correspondance', async () => {
		mockBuildStockpileListPayload.mockResolvedValue(v2Text('STOCKPILE_LIST_EMPTY'));
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
			channel: { id: 'c1', send: jest.fn() },
			user: { id: 'u1' },
			fields: { getTextInputValue: () => undefined },
			reply: jest.fn().mockResolvedValue(undefined),
			followUp: jest.fn().mockResolvedValue(undefined),
			replied: false,
			deferred: false,
		};
		await addModal.execute(i);
		expect(Number(i.reply.mock.calls[0][0].flags) & MessageFlags.Ephemeral).toBeTruthy();
		expect(Number(i.reply.mock.calls[0][0].flags) & MessageFlags.IsComponentsV2).toBeTruthy();
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
		expect(i.followUp).toHaveBeenCalledWith(v2Text('STOCKPILE_CREATE_ERROR', { ephemeral: true }));
	});
});
