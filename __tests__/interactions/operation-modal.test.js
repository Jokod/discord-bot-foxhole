const mockTranslate = jest.fn((key, params) => (params ? `${key}_${JSON.stringify(params)}` : key));

jest.mock('../../utils/translations.js', () => jest.fn().mockImplementation(() => ({ translate: mockTranslate })));
jest.mock('../../utils/markdown.js', () => ({
	safeEscapeMarkdown: (x) => x,
}));

const mockCreate = jest.fn().mockResolvedValue({});
const mockUpdateOne = jest.fn().mockResolvedValue({});
const mockStatsUpdate = jest.fn().mockResolvedValue({});

jest.mock('../../data/models.js', () => ({
	Operation: {
		create: (...args) => mockCreate(...args),
		updateOne: (...args) => mockUpdateOne(...args),
	},
	Stats: {
		findOneAndUpdate: (...args) => mockStatsUpdate(...args),
	},
}));

jest.mock('../../messages/react.js', () => ({
	execute: jest.fn().mockResolvedValue(undefined),
}));

const modalCreate = require('../../interactions/modals/operation/create.js');
const React = require('../../messages/react.js');

describe('Modal create operation', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	function interaction(fields, extra = {}) {
		return {
			id: 'interaction-1',
			client: {
				sessions: { 'g1:u1': { title: 'RAID' } },
				traductions: new Map(),
			},
			guild: { id: 'g1' },
			user: { id: 'u1' },
			channelId: 'c1',
			channel: { id: 'c1' },
			fields: {
				getTextInputValue: (id) => fields[id],
			},
			reply: jest.fn().mockResolvedValue({
				resource: { message: { id: 'msg-1' } },
			}),
			fetchReply: jest.fn().mockResolvedValue({ id: 'msg-1' }),
			followUp: jest.fn().mockResolvedValue(undefined),
			replied: false,
			deferred: false,
			...extra,
		};
	}

	it('refuse date invalide', async () => {
		const i = interaction({
			date: 'bad',
			time: '20:00',
			duration: '60',
			description: 'ok',
		});
		await modalCreate.execute(i);
		expect(i.reply).toHaveBeenCalledWith(expect.objectContaining({
			content: 'OPERATION_DATE_FORMAT_ERROR',
		}));
	});

	it('refuse time / duration / description invalides', async () => {
		await modalCreate.execute(interaction({
			date: '01/01/2026', time: '99:99', duration: '60', description: 'ok',
		}));
		expect(mockTranslate).toHaveBeenCalledWith('OPERATION_TIME_FORMAT_ERROR');

		await modalCreate.execute(interaction({
			date: '01/01/2026', time: '20:00', duration: 'abcd', description: 'ok',
		}));
		expect(mockTranslate).toHaveBeenCalledWith('OPERATION_DURATION_FORMAT_ERROR');

		await modalCreate.execute(interaction({
			date: '01/01/2026', time: '20:00', duration: '60', description: 'bad$$$',
		}));
		expect(mockTranslate).toHaveBeenCalledWith('OPERATION_DESCRIPTION_FORMAT_ERROR');
	});

	it('crée l’opération, stats et met à jour le message id', async () => {
		const i = interaction({
			date: '01/01/2026',
			time: '20:00',
			duration: '60',
			description: 'Push hex',
		});
		await modalCreate.execute(i);
		expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({
			title: 'RAID',
			guild_id: 'g1',
			status: 'pending',
		}));
		expect(mockStatsUpdate).toHaveBeenCalled();
		expect(mockUpdateOne).toHaveBeenCalledWith(
			{ guild_id: 'g1', operation_id: 'interaction-1' },
			expect.objectContaining({ operation_id: 'msg-1', channel_id: 'c1' }),
		);
		expect(React.execute).toHaveBeenCalled();
		expect(i.client.sessions['g1:u1']).toBeUndefined();
	});

	it('répond CREATE_ERROR si create échoue', async () => {
		mockCreate.mockRejectedValueOnce(new Error('db'));
		const err = jest.spyOn(console, 'error').mockImplementation(() => undefined);
		const i = interaction({
			date: '01/01/2026',
			time: '20:00',
			duration: '60',
			description: 'Push hex',
		});
		await modalCreate.execute(i);
		err.mockRestore();
		expect(i.reply).toHaveBeenCalledWith(expect.objectContaining({
			content: 'OPERATION_CREATE_ERROR',
		}));
	});

	it('followUp CREATE_ERROR si déjà replied', async () => {
		mockCreate.mockRejectedValueOnce(new Error('db'));
		const err = jest.spyOn(console, 'error').mockImplementation(() => undefined);
		const i = interaction({
			date: '01/01/2026',
			time: '20:00',
			duration: '60',
			description: 'Push hex',
		}, { replied: true });
		i.reply.mockResolvedValue({ resource: { message: { id: 'msg-1' } } });
		await modalCreate.execute(i);
		err.mockRestore();
		expect(i.followUp).toHaveBeenCalledWith(expect.objectContaining({
			content: 'OPERATION_CREATE_ERROR',
		}));
	});

	it('utilise fetchReply si resource.message absent', async () => {
		const i = interaction({
			date: '01/01/2026',
			time: '20:00',
			duration: '60',
			description: 'Push hex',
		});
		i.reply.mockResolvedValue({});
		i.fetchReply.mockResolvedValue({ id: 'fetched-msg' });
		await modalCreate.execute(i);
		expect(i.fetchReply).toHaveBeenCalled();
		expect(mockUpdateOne).toHaveBeenCalledWith(
			{ guild_id: 'g1', operation_id: 'interaction-1' },
			expect.objectContaining({ operation_id: 'fetched-msg' }),
		);
	});

	it('utilise channel.id si channelId absent', async () => {
		const i = interaction({
			date: '01/01/2026',
			time: '20:00',
			duration: '60',
			description: 'Push hex',
		});
		delete i.channelId;
		i.channel = { id: 'channel-only' };
		await modalCreate.execute(i);
		expect(mockUpdateOne).toHaveBeenCalledWith(
			{ guild_id: 'g1', operation_id: 'interaction-1' },
			expect.objectContaining({ channel_id: 'channel-only' }),
		);
	});

	it('enregistre channel_id null si channel absent', async () => {
		const i = interaction({
			date: '01/01/2026',
			time: '20:00',
			duration: '60',
			description: 'Push hex',
		});
		delete i.channelId;
		delete i.channel;
		await modalCreate.execute(i);
		expect(mockUpdateOne).toHaveBeenCalledWith(
			{ guild_id: 'g1', operation_id: 'interaction-1' },
			expect.objectContaining({ channel_id: null }),
		);
	});
});
