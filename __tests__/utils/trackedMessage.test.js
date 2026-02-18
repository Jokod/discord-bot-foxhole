const { findTrackedMessage, saveTrackedMessage, editTrackedOrFallback } = require('../../utils/trackedMessage.js');
const { TrackedMessage } = require('../../data/models.js');

jest.mock('../../data/models.js', () => ({
	TrackedMessage: {
		findOne: jest.fn(),
		findOneAndUpdate: jest.fn().mockResolvedValue(undefined),
		deleteOne: jest.fn().mockResolvedValue(undefined),
	},
}));

describe('utils/trackedMessage', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	describe('findTrackedMessage', () => {
		it('retourne null si le channel est absent ou non textuel', async () => {
			expect(await findTrackedMessage(null, 'guild-1', 'stockpile_list', { model: TrackedMessage })).toBeNull();
			expect(await findTrackedMessage({ isTextBased: () => false }, 'guild-1', 'stockpile_list', { model: TrackedMessage })).toBeNull();
			expect(TrackedMessage.findOne).not.toHaveBeenCalled();
		});

		it('retourne null si le model est absent', async () => {
			const channel = { id: 'ch-1', isTextBased: () => true };
			expect(await findTrackedMessage(channel, 'guild-1', 'stockpile_list', { model: null })).toBeNull();
			expect(TrackedMessage.findOne).not.toHaveBeenCalled();
		});

		it('retourne le message quand il existe en base et le fetch réussit', async () => {
			const fakeMessage = { id: 'msg-123', author: { id: 'bot' } };
			const channel = {
				id: 'ch-1',
				isTextBased: () => true,
				messages: { fetch: jest.fn().mockResolvedValue(fakeMessage) },
			};
			TrackedMessage.findOne.mockResolvedValue({ message_id: 'msg-123', _id: 'doc-1' });

			const result = await findTrackedMessage(channel, 'guild-1', 'stockpile_list', { model: TrackedMessage });

			expect(TrackedMessage.findOne).toHaveBeenCalledWith({
				server_id: 'guild-1',
				channel_id: 'ch-1',
				message_type: 'stockpile_list',
			});
			expect(channel.messages.fetch).toHaveBeenCalledWith('msg-123');
			expect(result).toBe(fakeMessage);
		});

		it('supprime l’entrée et tente le fallback si le message a été supprimé (fetch échoue)', async () => {
			const fakeMessage = { id: 'msg-456', author: { id: 'bot' } };
			const channel = {
				id: 'ch-1',
				isTextBased: () => true,
				messages: {
					fetch: jest.fn()
						.mockRejectedValueOnce(new Error('Unknown Message'))
						.mockResolvedValue([fakeMessage]),
				},
			};
			TrackedMessage.findOne.mockResolvedValue({ message_id: 'msg-deleted', _id: 'doc-1' });
			const fallbackMatcher = jest.fn((msgs) => msgs.find?.((m) => m.id === 'msg-456') ?? fakeMessage);

			const result = await findTrackedMessage(channel, 'guild-1', 'stockpile_list', {
				model: TrackedMessage,
				fallbackMatcher,
			});

			expect(TrackedMessage.deleteOne).toHaveBeenCalledWith({ _id: 'doc-1' });
			expect(fallbackMatcher).toHaveBeenCalled();
			expect(TrackedMessage.findOneAndUpdate).toHaveBeenCalledWith(
				{ server_id: 'guild-1', channel_id: 'ch-1', message_type: 'stockpile_list' },
				expect.objectContaining({ message_id: 'msg-456' }),
				{ upsert: true },
			);
			expect(result).toBe(fakeMessage);
		});

		it('utilise le fallbackMatcher et sauvegarde quand aucun ID en base', async () => {
			const fakeMessage = { id: 'msg-789', author: { id: 'bot' } };
			const messagesArr = [fakeMessage];
			const channel = {
				id: 'ch-1',
				isTextBased: () => true,
				messages: { fetch: jest.fn().mockResolvedValue(messagesArr) },
			};
			TrackedMessage.findOne.mockResolvedValue(null);
			const fallbackMatcher = jest.fn((msgs) => msgs.find?.((m) => m.id === 'msg-789') ?? fakeMessage);

			const result = await findTrackedMessage(channel, 'guild-1', 'stockpile_list', {
				model: TrackedMessage,
				fallbackMatcher,
			});

			expect(fallbackMatcher).toHaveBeenCalledWith(messagesArr);
			expect(TrackedMessage.findOneAndUpdate).toHaveBeenCalledWith(
				{ server_id: 'guild-1', channel_id: 'ch-1', message_type: 'stockpile_list' },
				expect.objectContaining({ message_id: 'msg-789' }),
				{ upsert: true },
			);
			expect(result).toBe(fakeMessage);
		});

		it('retourne null si le fallbackMatcher ne trouve rien', async () => {
			const channel = {
				id: 'ch-1',
				isTextBased: () => true,
				messages: { fetch: jest.fn().mockResolvedValue([]) },
			};
			TrackedMessage.findOne.mockResolvedValue(null);
			const fallbackMatcher = jest.fn(() => null);

			const result = await findTrackedMessage(channel, 'guild-1', 'stockpile_list', {
				model: TrackedMessage,
				fallbackMatcher,
			});

			expect(result).toBeNull();
			expect(TrackedMessage.findOneAndUpdate).not.toHaveBeenCalled();
		});
	});

	describe('saveTrackedMessage', () => {
		it('n’appelle pas findOneAndUpdate si un paramètre est manquant', async () => {
			await saveTrackedMessage('guild-1', 'ch-1', 'msg-1', 'stockpile_list', null);
			await saveTrackedMessage(null, 'ch-1', 'msg-1', 'stockpile_list', TrackedMessage);
			await saveTrackedMessage('guild-1', null, 'msg-1', 'stockpile_list', TrackedMessage);
			await saveTrackedMessage('guild-1', 'ch-1', null, 'stockpile_list', TrackedMessage);
			await saveTrackedMessage('guild-1', 'ch-1', 'msg-1', '', TrackedMessage);

			expect(TrackedMessage.findOneAndUpdate).not.toHaveBeenCalled();
		});

		it('appelle findOneAndUpdate avec les bons paramètres', async () => {
			await saveTrackedMessage('guild-1', 'ch-1', 'msg-123', 'stockpile_list', TrackedMessage);

			expect(TrackedMessage.findOneAndUpdate).toHaveBeenCalledWith(
				{ server_id: 'guild-1', channel_id: 'ch-1', message_type: 'stockpile_list' },
				{ server_id: 'guild-1', channel_id: 'ch-1', message_type: 'stockpile_list', message_id: 'msg-123' },
				{ upsert: true },
			);
		});
	});

	describe('editTrackedOrFallback', () => {
		it('édite le message trouvé et n’appelle pas fallbackSend', async () => {
			const editMock = jest.fn().mockResolvedValue(undefined);
			const fallbackSend = jest.fn();
			TrackedMessage.findOne.mockResolvedValue({ message_id: 'msg-1', _id: 'doc-1' });
			const channel = {
				id: 'ch-1',
				isTextBased: () => true,
				messages: { fetch: jest.fn().mockResolvedValue({ id: 'msg-1', edit: editMock }) },
			};

			await editTrackedOrFallback({
				channel,
				serverId: 'guild-1',
				messageType: 'stockpile_list',
				model: TrackedMessage,
				fallbackMatcher: null,
				editPayload: { content: 'test' },
				fallbackSend,
			});

			expect(editMock).toHaveBeenCalledWith({ content: 'test' });
			expect(fallbackSend).not.toHaveBeenCalled();
		});

		it('appelle fallbackSend et sauvegarde quand aucun message trouvé', async () => {
			TrackedMessage.findOne.mockResolvedValue(null);
			const channel = {
				id: 'ch-1',
				isTextBased: () => true,
				messages: { fetch: jest.fn().mockResolvedValue([]) },
			};
			const fakeMsg = { id: 'msg-new' };
			const fallbackSend = jest.fn().mockResolvedValue(fakeMsg);

			await editTrackedOrFallback({
				channel,
				serverId: 'guild-1',
				messageType: 'stockpile_list',
				model: TrackedMessage,
				fallbackMatcher: null,
				editPayload: { content: 'test' },
				fallbackSend,
			});

			expect(fallbackSend).toHaveBeenCalled();
			expect(TrackedMessage.findOneAndUpdate).toHaveBeenCalledWith(
				expect.anything(),
				expect.objectContaining({ message_id: 'msg-new' }),
				{ upsert: true },
			);
		});

		it('appelle fallbackSend quand l’édition échoue', async () => {
			const editMock = jest.fn().mockRejectedValue(new Error('Unknown'));
			TrackedMessage.findOne.mockResolvedValue({ message_id: 'msg-1', _id: 'doc-1' });
			const channel = {
				id: 'ch-1',
				isTextBased: () => true,
				messages: { fetch: jest.fn().mockResolvedValue({ id: 'msg-1', edit: editMock }) },
			};
			const fakeMsg = { id: 'msg-fallback' };
			const fallbackSend = jest.fn().mockResolvedValue(fakeMsg);

			await editTrackedOrFallback({
				channel,
				serverId: 'guild-1',
				messageType: 'stockpile_list',
				model: TrackedMessage,
				fallbackMatcher: null,
				editPayload: { content: 'test' },
				fallbackSend,
			});

			expect(editMock).toHaveBeenCalled();
			expect(fallbackSend).toHaveBeenCalled();
		});
	});
});
