const { PermissionFlagsBits } = require('discord.js');
const {
	isMissingAccessError,
	isUnknownMessageError,
	isExpiredInteractionError,
	botCanPostInChannel,
	getDiscordErrorCode,
	buildBotInviteUrl,
	missingChannelAccessText,
} = require('../../utils/discordAccess.js');

describe('discordAccess', () => {
	describe('getDiscordErrorCode', () => {
		it('retourne null pour valeurs non-objets', () => {
			expect(getDiscordErrorCode(null)).toBeNull();
			expect(getDiscordErrorCode(undefined)).toBeNull();
			expect(getDiscordErrorCode('x')).toBeNull();
		});

		it('préfère code numérique puis rawError.code', () => {
			expect(getDiscordErrorCode({ code: 50001 })).toBe(50001);
			expect(getDiscordErrorCode({ rawError: { code: 50013 } })).toBe(50013);
			expect(getDiscordErrorCode({ code: 'nope', rawError: { code: 50008 } })).toBe(50008);
			expect(getDiscordErrorCode({ code: 'nope' })).toBeNull();
		});
	});

	describe('isUnknownMessageError', () => {
		it('détecte 10008', () => {
			expect(isUnknownMessageError({ code: 10008 })).toBe(true);
			expect(isUnknownMessageError({ rawError: { code: 10008 } })).toBe(true);
			expect(isUnknownMessageError({ code: 50035 })).toBe(false);
		});
	});

	describe('isMissingAccessError', () => {
		it('détecte code 50001', () => {
			expect(isMissingAccessError({ code: 50001 })).toBe(true);
		});

		it('détecte rawError.code 50001', () => {
			expect(isMissingAccessError({ rawError: { code: 50001 } })).toBe(true);
		});

		it('détecte Missing Permissions 50013 et non-text 50008', () => {
			expect(isMissingAccessError({ code: 50013 })).toBe(true);
			expect(isMissingAccessError({ code: 50008 })).toBe(true);
		});

		it('ignore les autres erreurs', () => {
			expect(isMissingAccessError(null)).toBe(false);
			expect(isMissingAccessError({ code: 10008 })).toBe(false);
			expect(isMissingAccessError({ status: 403 })).toBe(false);
			expect(isMissingAccessError(new Error('boom'))).toBe(false);
		});

		it('détecte le message Discord sans code numérique', () => {
			expect(isMissingAccessError(new Error('Missing Access'))).toBe(true);
			expect(isMissingAccessError({ message: 'Missing Permissions' })).toBe(true);
		});
	});

	describe('isExpiredInteractionError', () => {
		it('détecte 10062 et 40060', () => {
			expect(isExpiredInteractionError({ code: 10062 })).toBe(true);
			expect(isExpiredInteractionError({ code: 40060 })).toBe(true);
			expect(isExpiredInteractionError({ rawError: { code: 10062 } })).toBe(true);
			expect(isExpiredInteractionError({ code: 50001 })).toBe(false);
			expect(isExpiredInteractionError(null)).toBe(false);
		});
	});

	describe('botCanPostInChannel', () => {
		it('refuse sans salon textuel', () => {
			expect(botCanPostInChannel(null, { members: { me: {} } })).toBe(false);
			expect(botCanPostInChannel({ isTextBased: () => false }, { members: { me: {} } })).toBe(false);
			expect(botCanPostInChannel({}, { members: { me: {} } })).toBe(false);
		});

		it('autorise si members.me est absent (laisse l’API trancher)', () => {
			const channel = { isTextBased: () => true, permissionsFor: jest.fn() };
			expect(botCanPostInChannel(channel, { members: {} })).toBe(true);
			expect(botCanPostInChannel(channel, null)).toBe(true);
			expect(channel.permissionsFor).not.toHaveBeenCalled();
		});

		it('autorise si permissionsFor est absent ou renvoie null', () => {
			const withoutFn = { isTextBased: () => true };
			expect(botCanPostInChannel(withoutFn, { members: { me: { id: 'bot' } } })).toBe(true);

			const returnsNull = {
				isTextBased: () => true,
				permissionsFor: () => null,
			};
			expect(botCanPostInChannel(returnsNull, { members: { me: { id: 'bot' } } })).toBe(true);
		});

		it('vérifie ViewChannel + SendMessages (EmbedLinks optionnel)', () => {
			const me = { id: 'bot' };
			const has = jest.fn((flag) => [
				PermissionFlagsBits.ViewChannel,
				PermissionFlagsBits.SendMessages,
			].includes(flag));
			const channel = {
				isTextBased: () => true,
				permissionsFor: jest.fn(() => ({ has })),
			};
			expect(botCanPostInChannel(channel, { members: { me } })).toBe(true);
			expect(channel.permissionsFor).toHaveBeenCalledWith(me);
		});

		it('refuse sans ViewChannel ou SendMessages', () => {
			const channel = {
				isTextBased: () => true,
				permissionsFor: () => ({ has: () => false }),
			};
			expect(botCanPostInChannel(channel, { members: { me: {} } })).toBe(false);
		});

		it('refuse sans EmbedLinks quand embeds=true', () => {
			const has = jest.fn((flag) => flag !== PermissionFlagsBits.EmbedLinks);
			const channel = {
				isTextBased: () => true,
				permissionsFor: () => ({ has }),
			};
			expect(botCanPostInChannel(channel, { members: { me: {} } }, { embeds: true })).toBe(false);
			expect(botCanPostInChannel(channel, { members: { me: {} } })).toBe(true);
		});
	});

	describe('buildBotInviteUrl / missingChannelAccessText', () => {
		const { BOT_INVITE_PERMISSIONS } = require('../../utils/constants.js');

		it('construit l’URL OAuth avec CLIENT_ID', () => {
			expect(buildBotInviteUrl('123')).toBe(
				`https://discord.com/api/oauth2/authorize?client_id=123&permissions=${BOT_INVITE_PERMISSIONS}&scope=bot%20applications.commands`,
			);
			expect(buildBotInviteUrl('')).toBeNull();
			expect(buildBotInviteUrl('  ')).toBeNull();
		});

		it('missingChannelAccessText injecte l’URL dans la traduction', () => {
			const prev = process.env.CLIENT_ID;
			process.env.CLIENT_ID = 'app-1';
			const translate = jest.fn((key, params) => `${key}:${params.url}`);
			expect(missingChannelAccessText({ translate })).toContain('client_id=app-1');
			expect(translate).toHaveBeenCalledWith('BOT_MISSING_CHANNEL_ACCESS', {
				url: expect.stringContaining('client_id=app-1'),
			});
			delete process.env.CLIENT_ID;
			expect(missingChannelAccessText({ translate: (k, p) => `${k}:${p.url}` }))
				.toContain('developers/applications');
			process.env.CLIENT_ID = prev;
		});
	});
});
