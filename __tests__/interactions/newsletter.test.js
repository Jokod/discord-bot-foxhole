const mockTranslate = jest.fn((key, params = {}) => {
	if (params.sent !== undefined) return `${key}:${params.sent}/${params.total}`;
	if (params.length !== undefined) return `${key}:${params.length}/${params.limit}`;
	return key;
});

const { PermissionFlagsBits } = require('discord.js');

jest.mock('../../utils/translations.js', () => jest.fn().mockImplementation(() => ({ translate: mockTranslate })));

jest.mock('../../data/models.js', () => ({
	NotificationSubscription: {
		findOne: jest.fn(),
		create: jest.fn(),
		deleteOne: jest.fn(),
	},
}));

jest.mock('../../utils/notifications.js', () => ({
	broadcastToSubscribers: jest.fn(),
}));

jest.mock('fs', () => ({
	existsSync: jest.fn(),
	readFileSync: jest.fn(),
}));

const fs = require('fs');
const { NotificationSubscription } = require('../../data/models.js');
const { broadcastToSubscribers } = require('../../utils/notifications.js');

describe('Slash command /newsletter', () => {
	let newsletterCommand;
	const originalOwner = process.env.OWNER;

	beforeEach(() => {
		jest.clearAllMocks();
		process.env.OWNER = 'owner-123';
		jest.isolateModules(() => {
			newsletterCommand = require('../../interactions/slash/misc/newsletter.js');
		});
	});

	afterAll(() => {
		process.env.OWNER = originalOwner;
	});

	function createInteraction(subcommand, overrides = {}) {
		const guild = { id: 'guild-123' };
		const channelId = 'channel-456';
		const getSubcommand = jest.fn(() => subcommand);
		return {
			client: { traductions: new Map(), slashCommands: new Map() },
			guild,
			channelId,
			user: { id: 'user-789' },
			options: { getSubcommand, getString: jest.fn() },
			reply: jest.fn().mockResolvedValue(undefined),
			member: {
				permissions: {
					has: jest.fn((perm) => perm === PermissionFlagsBits.ManageGuild),
				},
			},
			...overrides,
		};
	}

	describe('subscribe', () => {
		it('refuse si l’utilisateur n’a pas ManageGuild', async () => {
			const interaction = createInteraction('subscribe');
			interaction.member.permissions.has.mockReturnValue(false);
			await newsletterCommand.execute(interaction);
			expect(NotificationSubscription.findOne).not.toHaveBeenCalled();
			expect(interaction.reply).toHaveBeenCalledWith(
				expect.objectContaining({ content: 'NEWSLETTER_NO_PERMS', flags: 64 }),
			);
		});

		it('répond ALREADY_SUBSCRIBED si le salon est déjà abonné', async () => {
			NotificationSubscription.findOne.mockResolvedValue({ guild_id: 'guild-123', channel_id: 'channel-456' });
			const interaction = createInteraction('subscribe');
			await newsletterCommand.execute(interaction);
			expect(NotificationSubscription.findOne).toHaveBeenCalledWith({
				guild_id: 'guild-123',
				channel_id: 'channel-456',
				notification_type: 'newsletter',
			});
			expect(NotificationSubscription.create).not.toHaveBeenCalled();
			expect(interaction.reply).toHaveBeenCalledWith(
				expect.objectContaining({ content: 'NEWSLETTER_ALREADY_SUBSCRIBED', flags: 64 }),
			);
		});

		it('crée l’abonnement et répond SUBSCRIBE_SUCCESS', async () => {
			NotificationSubscription.findOne.mockResolvedValue(null);
			NotificationSubscription.create.mockResolvedValue(undefined);
			const interaction = createInteraction('subscribe');
			await newsletterCommand.execute(interaction);
			expect(NotificationSubscription.create).toHaveBeenCalledWith({
				guild_id: 'guild-123',
				channel_id: 'channel-456',
				notification_type: 'newsletter',
			});
			expect(interaction.reply).toHaveBeenCalledWith(
				expect.objectContaining({ content: 'NEWSLETTER_SUBSCRIBE_SUCCESS', flags: 64 }),
			);
		});
	});

	describe('unsubscribe', () => {
		it('refuse si l’utilisateur n’a pas ManageGuild', async () => {
			const interaction = createInteraction('unsubscribe');
			interaction.member.permissions.has.mockReturnValue(false);
			await newsletterCommand.execute(interaction);
			expect(NotificationSubscription.deleteOne).not.toHaveBeenCalled();
			expect(interaction.reply).toHaveBeenCalledWith(
				expect.objectContaining({ content: 'NEWSLETTER_NO_PERMS', flags: 64 }),
			);
		});

		it('répond NOT_SUBSCRIBED si le salon n’est pas abonné', async () => {
			NotificationSubscription.deleteOne.mockResolvedValue({ deletedCount: 0 });
			const interaction = createInteraction('unsubscribe');
			await newsletterCommand.execute(interaction);
			expect(NotificationSubscription.deleteOne).toHaveBeenCalledWith({
				guild_id: 'guild-123',
				channel_id: 'channel-456',
				notification_type: 'newsletter',
			});
			expect(interaction.reply).toHaveBeenCalledWith(
				expect.objectContaining({ content: 'NEWSLETTER_NOT_SUBSCRIBED', flags: 64 }),
			);
		});

		it('supprime l’abonnement et répond UNSUBSCRIBE_SUCCESS', async () => {
			NotificationSubscription.deleteOne.mockResolvedValue({ deletedCount: 1 });
			const interaction = createInteraction('unsubscribe');
			await newsletterCommand.execute(interaction);
			expect(interaction.reply).toHaveBeenCalledWith(
				expect.objectContaining({ content: 'NEWSLETTER_UNSUBSCRIBE_SUCCESS', flags: 64 }),
			);
		});
	});

	describe('publish', () => {
		it('refuse si l’utilisateur n’est pas le propriétaire du bot', async () => {
			const interaction = createInteraction('publish');
			await newsletterCommand.execute(interaction);
			expect(broadcastToSubscribers).not.toHaveBeenCalled();
			expect(fs.existsSync).not.toHaveBeenCalled();
			expect(interaction.reply).toHaveBeenCalledWith(
				expect.objectContaining({ content: 'OWNER_ONLY', flags: 64 }),
			);
		});

		it('répond FILE_MISSING si data/newsletter.md n’existe pas', async () => {
			fs.existsSync.mockReturnValue(false);
			const interaction = createInteraction('publish', { user: { id: 'owner-123' } });
			await newsletterCommand.execute(interaction);
			expect(broadcastToSubscribers).not.toHaveBeenCalled();
			expect(interaction.reply).toHaveBeenCalledWith(
				expect.objectContaining({ content: 'NEWSLETTER_FILE_MISSING', flags: 64 }),
			);
		});

		it('répond FILE_EMPTY si le fichier est vide', async () => {
			fs.existsSync.mockReturnValue(true);
			fs.readFileSync.mockReturnValue('   \n  ');
			const interaction = createInteraction('publish', { user: { id: 'owner-123' } });
			await newsletterCommand.execute(interaction);
			expect(broadcastToSubscribers).not.toHaveBeenCalled();
			expect(interaction.reply).toHaveBeenCalledWith(
				expect.objectContaining({ content: 'NEWSLETTER_FILE_EMPTY', flags: 64 }),
			);
		});

		it('répond FILE_TOO_LONG si le fichier dépasse 2000 caractères', async () => {
			fs.existsSync.mockReturnValue(true);
			fs.readFileSync.mockReturnValue('x'.repeat(2001));
			const interaction = createInteraction('publish', { user: { id: 'owner-123' } });
			await newsletterCommand.execute(interaction);
			expect(broadcastToSubscribers).not.toHaveBeenCalled();
			expect(interaction.reply).toHaveBeenCalledWith(
				expect.objectContaining({ content: 'NEWSLETTER_FILE_TOO_LONG:2001/2000', flags: 64 }),
			);
		});

		it('répond PUBLISH_EMPTY si aucun salon abonné', async () => {
			fs.existsSync.mockReturnValue(true);
			fs.readFileSync.mockReturnValue('**News**\n\n- item');
			broadcastToSubscribers.mockResolvedValue({ sent: 0, total: 0 });
			const interaction = createInteraction('publish', { user: { id: 'owner-123' } });
			await newsletterCommand.execute(interaction);
			expect(broadcastToSubscribers).toHaveBeenCalledWith(
				interaction.client,
				'newsletter',
				{ content: '**News**\n\n- item' },
			);
			expect(interaction.reply).toHaveBeenCalledWith(
				expect.objectContaining({ content: 'NEWSLETTER_PUBLISH_EMPTY', flags: 64 }),
			);
		});

		it('publie le contenu du fichier et répond PUBLISH_SUCCESS', async () => {
			fs.existsSync.mockReturnValue(true);
			fs.readFileSync.mockReturnValue('**Mise à jour**\n\n- Correction');
			broadcastToSubscribers.mockResolvedValue({ sent: 3, total: 4 });
			const interaction = createInteraction('publish', { user: { id: 'owner-123' } });
			await newsletterCommand.execute(interaction);
			expect(broadcastToSubscribers).toHaveBeenCalledWith(
				interaction.client,
				'newsletter',
				{ content: '**Mise à jour**\n\n- Correction' },
			);
			expect(interaction.reply).toHaveBeenCalledWith(
				expect.objectContaining({ content: 'NEWSLETTER_PUBLISH_SUCCESS:3/4', flags: 64 }),
			);
		});
	});
});
