const mockTranslate = jest.fn((key) => key);

const { PermissionFlagsBits } = require('discord.js');

jest.mock('../../utils/translations.js', () => jest.fn().mockImplementation(() => ({ translate: mockTranslate })));

jest.mock('../../data/models.js', () => ({
	NotificationSubscription: {
		findOne: jest.fn(),
		create: jest.fn(),
		deleteOne: jest.fn(),
		find: jest.fn(),
	},
}));

const { NotificationSubscription } = require('../../data/models.js');

describe('Slash command /notification', () => {
	let notificationCommand;

	beforeEach(() => {
		jest.clearAllMocks();
		notificationCommand = require('../../interactions/slash/notification/notification.js');
	});

	function createInteraction(subcommand, options = {}, overrides = {}) {
		const guild = { id: 'guild-123' };
		const channelId = 'channel-456';
		const getString = jest.fn((name) => (options[name] !== undefined ? options[name] : null));
		const getSubcommand = jest.fn(() => subcommand);
		return {
			client: { traductions: new Map(), slashCommands: new Map() },
			guild,
			channelId,
			user: { id: 'user-789' },
			options: { getSubcommand, getString },
			reply: jest.fn().mockResolvedValue(undefined),
			member: {
				permissions: {
					has: jest.fn((perm) => perm === PermissionFlagsBits.ManageChannels),
				},
			},
			...overrides,
		};
	}

	describe('subscribe', () => {
		it('refuse si l’utilisateur n’a pas ManageChannels', async () => {
			const interaction = createInteraction('subscribe', { type: 'stockpile_activity' });
			interaction.member.permissions.has.mockReturnValue(false);
			await notificationCommand.execute(interaction);
			expect(NotificationSubscription.findOne).not.toHaveBeenCalled();
			expect(interaction.reply).toHaveBeenCalledWith(
				expect.objectContaining({ content: 'NOTIFICATION_NO_PERMS', flags: 64 }),
			);
		});

		it('répond ALREADY_SUBSCRIBED si le salon est déjà abonné', async () => {
			NotificationSubscription.findOne.mockResolvedValue({ guild_id: 'guild-123', channel_id: 'channel-456' });
			const interaction = createInteraction('subscribe', { type: 'stockpile_activity' });
			await notificationCommand.execute(interaction);
			expect(NotificationSubscription.findOne).toHaveBeenCalledWith({
				guild_id: 'guild-123',
				channel_id: 'channel-456',
				notification_type: 'stockpile_activity',
			});
			expect(NotificationSubscription.create).not.toHaveBeenCalled();
			expect(interaction.reply).toHaveBeenCalledWith(
				expect.objectContaining({ content: 'NOTIFICATION_ALREADY_SUBSCRIBED', flags: 64 }),
			);
		});

		it('crée l’abonnement et répond SUBSCRIBE_SUCCESS', async () => {
			NotificationSubscription.findOne.mockResolvedValue(null);
			NotificationSubscription.create.mockResolvedValue(undefined);
			const interaction = createInteraction('subscribe', { type: 'stockpile_expiring' });
			await notificationCommand.execute(interaction);
			expect(NotificationSubscription.create).toHaveBeenCalledWith({
				guild_id: 'guild-123',
				channel_id: 'channel-456',
				notification_type: 'stockpile_expiring',
			});
			expect(interaction.reply).toHaveBeenCalledWith(
				expect.objectContaining({ content: 'NOTIFICATION_SUBSCRIBE_SUCCESS', flags: 64 }),
			);
		});
	});

	describe('unsubscribe', () => {
		it('refuse si l’utilisateur n’a pas ManageChannels', async () => {
			const interaction = createInteraction('unsubscribe', { type: 'stockpile_activity' });
			interaction.member.permissions.has.mockReturnValue(false);
			await notificationCommand.execute(interaction);
			expect(NotificationSubscription.deleteOne).not.toHaveBeenCalled();
			expect(interaction.reply).toHaveBeenCalledWith(
				expect.objectContaining({ content: 'NOTIFICATION_NO_PERMS', flags: 64 }),
			);
		});

		it('répond NOT_SUBSCRIBED si le salon n’est pas abonné', async () => {
			NotificationSubscription.deleteOne.mockResolvedValue({ deletedCount: 0 });
			const interaction = createInteraction('unsubscribe', { type: 'stockpile_activity' });
			await notificationCommand.execute(interaction);
			expect(NotificationSubscription.deleteOne).toHaveBeenCalledWith({
				guild_id: 'guild-123',
				channel_id: 'channel-456',
				notification_type: 'stockpile_activity',
			});
			expect(interaction.reply).toHaveBeenCalledWith(
				expect.objectContaining({ content: 'NOTIFICATION_NOT_SUBSCRIBED', flags: 64 }),
			);
		});

		it('supprime l’abonnement et répond UNSUBSCRIBE_SUCCESS', async () => {
			NotificationSubscription.deleteOne.mockResolvedValue({ deletedCount: 1 });
			const interaction = createInteraction('unsubscribe', { type: 'stockpile_expiring' });
			await notificationCommand.execute(interaction);
			expect(NotificationSubscription.deleteOne).toHaveBeenCalledWith({
				guild_id: 'guild-123',
				channel_id: 'channel-456',
				notification_type: 'stockpile_expiring',
			});
			expect(interaction.reply).toHaveBeenCalledWith(
				expect.objectContaining({ content: 'NOTIFICATION_UNSUBSCRIBE_SUCCESS', flags: 64 }),
			);
		});
	});

	describe('list', () => {
		it('répond LIST_EMPTY quand aucun salon n’est abonné', async () => {
			NotificationSubscription.find.mockReturnValue({ lean: jest.fn().mockResolvedValue([]) });
			const interaction = createInteraction('list');
			await notificationCommand.execute(interaction);
			expect(NotificationSubscription.find).toHaveBeenCalledWith({ guild_id: 'guild-123' });
			expect(interaction.reply).toHaveBeenCalledWith(
				expect.objectContaining({ content: 'NOTIFICATION_LIST_EMPTY', flags: 64 }),
			);
		});

		it('affiche la liste des abonnements groupés par type', async () => {
			NotificationSubscription.find.mockReturnValue({
				lean: jest.fn().mockResolvedValue([
					{ notification_type: 'stockpile_activity', channel_id: 'ch-1' },
					{ notification_type: 'stockpile_activity', channel_id: 'ch-2' },
					{ notification_type: 'stockpile_expiring', channel_id: 'ch-1' },
				]),
			});
			const interaction = createInteraction('list');
			await notificationCommand.execute(interaction);
			expect(interaction.reply).toHaveBeenCalledWith(
				expect.objectContaining({
					content: expect.stringContaining('NOTIFICATION_LIST_HEADER'),
					flags: 64,
				}),
			);
			expect(interaction.reply.mock.calls[0][0].content).toContain('<#ch-1>');
			expect(interaction.reply.mock.calls[0][0].content).toContain('<#ch-2>');
		});
	});
});
