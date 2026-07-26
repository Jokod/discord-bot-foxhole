const mockTranslate = jest.fn((key) => key);

const { PermissionFlagsBits } = require('discord.js');

jest.mock('../../utils/translations.js', () => jest.fn().mockImplementation(() => ({ translate: mockTranslate })));

jest.mock('../../data/models.js', () => ({
	NotificationSubscription: {
		findOne: jest.fn(),
		create: jest.fn(),
		deleteOne: jest.fn(),
	},
}));

const { NotificationSubscription } = require('../../data/models.js');

describe('Slash command /newsletter', () => {
	let newsletterCommand;

	beforeEach(() => {
		jest.clearAllMocks();
		newsletterCommand = require('../../interactions/slash/misc/newsletter.js');
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

	it('n’expose pas de sous-commande publish', () => {
		const json = newsletterCommand.data.toJSON();
		const names = json.options.map((opt) => opt.name);
		expect(names).toEqual(['subscribe', 'unsubscribe']);
	});

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
});
