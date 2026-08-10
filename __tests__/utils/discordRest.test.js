'use strict';

const { avatarUrl, mapUser } = require('../../utils/discordRest');

describe('discordRest', () => {
	it('avatarUrl builds custom avatar url', () => {
		expect(avatarUrl({ id: '1', avatar: 'abc' })).toBe(
			'https://cdn.discordapp.com/avatars/1/abc.png?size=64',
		);
		expect(avatarUrl({ id: '1', avatar: 'a_abc' })).toBe(
			'https://cdn.discordapp.com/avatars/1/a_abc.gif?size=64',
		);
	});

	it('mapUser maps discord user payload', () => {
		expect(mapUser({
			id: '99',
			username: 'fox',
			global_name: 'Fox',
			avatar: null,
			discriminator: '0',
		})).toMatchObject({
			user_id: '99',
			username: 'fox',
			display_name: 'Fox',
			profile_url: 'https://discord.com/users/99',
		});
	});

	it('mapUser returns null without id', () => {
		expect(mapUser(null)).toBeNull();
		expect(mapUser({})).toBeNull();
	});
});
