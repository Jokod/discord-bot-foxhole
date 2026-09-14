const { handleInteractionError } = require('../../utils/interactionErrors.js');
const { v2Text } = require('../../utils/componentsV2.js');

describe('handleInteractionError', () => {
	const translations = { translate: (key) => key };

	beforeEach(() => {
		jest.spyOn(console, 'error').mockImplementation(() => undefined);
		jest.spyOn(console, 'warn').mockImplementation(() => undefined);
		jest.clearAllMocks();
	});

	afterEach(() => {
		jest.restoreAllMocks();
	});

	it('reply COMMAND_EXECUTE_ERROR si non deferred', async () => {
		const interaction = {
			replied: false,
			deferred: false,
			channelId: 'c1',
			reply: jest.fn().mockResolvedValue(undefined),
			editReply: jest.fn(),
			followUp: jest.fn(),
		};
		await handleInteractionError(interaction, translations, new Error('boom'));
		expect(interaction.reply).toHaveBeenCalledWith(v2Text('COMMAND_EXECUTE_ERROR', { ephemeral: true }));
		expect(console.error).toHaveBeenCalled();
	});

	it('editReply BOT_MISSING_CHANNEL_ACCESS si deferred (50001)', async () => {
		const interaction = {
			replied: false,
			deferred: true,
			channelId: 'c1',
			reply: jest.fn(),
			editReply: jest.fn().mockResolvedValue(undefined),
			followUp: jest.fn(),
		};
		await handleInteractionError(interaction, translations, { code: 50001, message: 'Missing Access' });
		expect(interaction.editReply).toHaveBeenCalledWith(v2Text('BOT_MISSING_CHANNEL_ACCESS'));
		expect(interaction.followUp).not.toHaveBeenCalled();
		expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('c1'));
		expect(console.error).not.toHaveBeenCalled();
	});

	it('editReply BOT_MISSING_CHANNEL_ACCESS si deferred (50013)', async () => {
		const interaction = {
			replied: false,
			deferred: true,
			channelId: 'c1',
			reply: jest.fn(),
			editReply: jest.fn().mockResolvedValue(undefined),
			followUp: jest.fn(),
		};
		await handleInteractionError(interaction, translations, { code: 50013, message: 'Missing Permissions' });
		expect(interaction.editReply).toHaveBeenCalledWith(v2Text('BOT_MISSING_CHANNEL_ACCESS'));
		expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('code 50013'));
	});

	it('utilise channel.id puis ? pour le log Missing Access', async () => {
		const withChannel = {
			replied: false,
			deferred: true,
			channelId: null,
			channel: { id: 'from-channel' },
			editReply: jest.fn().mockResolvedValue(undefined),
			followUp: jest.fn(),
			reply: jest.fn(),
		};
		await handleInteractionError(withChannel, translations, { code: 50001 });
		expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('from-channel'));

		const none = {
			replied: false,
			deferred: true,
			channelId: null,
			channel: null,
			editReply: jest.fn().mockResolvedValue(undefined),
			followUp: jest.fn(),
			reply: jest.fn(),
		};
		await handleInteractionError(none, translations, { code: 50001 });
		expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('canal ?'));
	});

	it('followUp si déjà replied', async () => {
		const interaction = {
			replied: true,
			deferred: false,
			channelId: 'c1',
			reply: jest.fn(),
			editReply: jest.fn(),
			followUp: jest.fn().mockResolvedValue(undefined),
		};
		await handleInteractionError(interaction, translations, new Error('x'));
		expect(interaction.followUp).toHaveBeenCalledWith(v2Text('COMMAND_EXECUTE_ERROR', { ephemeral: true }));
	});

	it('followUp si deferred et déjà replied', async () => {
		const interaction = {
			replied: true,
			deferred: true,
			channelId: 'c1',
			reply: jest.fn(),
			editReply: jest.fn(),
			followUp: jest.fn().mockResolvedValue(undefined),
		};
		await handleInteractionError(interaction, translations, new Error('x'));
		expect(interaction.followUp).toHaveBeenCalled();
		expect(interaction.editReply).not.toHaveBeenCalled();
	});

	it('log si l’envoi de l’erreur échoue aussi', async () => {
		const interaction = {
			replied: false,
			deferred: false,
			channelId: 'c1',
			reply: jest.fn().mockRejectedValue(new Error('reply fail')),
			editReply: jest.fn(),
			followUp: jest.fn(),
		};
		await handleInteractionError(interaction, translations, new Error('boom'));
		expect(console.error).toHaveBeenCalledWith(
			'Failed to send error message to interaction:',
			expect.any(Error),
		);
	});
});
