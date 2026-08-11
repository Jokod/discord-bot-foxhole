'use strict';

const {
	avatarUrl,
	mapUser,
	discordFetch,
	leaveGuildRest,
	sendChannelMessage,
	fetchGuildChannels,
	fetchGuild,
	sleep,
} = require('../../utils/discordRest');

describe('discordRest', () => {
	const prevToken = process.env.TOKEN;

	beforeEach(() => {
		jest.clearAllMocks();
		process.env.TOKEN = 'bot-token';
		global.fetch = jest.fn();
	});

	afterAll(() => {
		process.env.TOKEN = prevToken;
		delete global.fetch;
	});

	it('avatarUrl builds custom avatar url', () => {
		expect(avatarUrl({ id: '1', avatar: 'abc' })).toBe(
			'https://cdn.discordapp.com/avatars/1/abc.png?size=64',
		);
		expect(avatarUrl({ id: '1', avatar: 'a_abc' })).toBe(
			'https://cdn.discordapp.com/avatars/1/a_abc.gif?size=64',
		);
	});

	it('avatarUrl fallback discriminator / snowflake', () => {
		expect(avatarUrl(null)).toBeNull();
		expect(avatarUrl({ id: '1', discriminator: '0012' })).toBe(
			'https://cdn.discordapp.com/embed/avatars/2.png',
		);
		expect(avatarUrl({ id: '123456789012345678', discriminator: '0' })).toMatch(
			/^https:\/\/cdn\.discordapp\.com\/embed\/avatars\/\d\.png$/,
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

	it('sleep resolves', async () => {
		jest.useFakeTimers();
		const p = sleep(50);
		jest.advanceTimersByTime(50);
		await expect(p).resolves.toBeUndefined();
		jest.useRealTimers();
	});

	it('sleep resolve callback via mocked setTimeout', async () => {
		const spy = jest.spyOn(global, 'setTimeout').mockImplementation((fn) => {
			fn();
			return 0;
		});
		await expect(sleep(10)).resolves.toBeUndefined();
		spy.mockRestore();
	});

	it('discordFetch ok response text catch retourne vide', async () => {
		global.fetch.mockResolvedValue({
			status: 200,
			ok: true,
			text: async () => { throw new Error('read fail'); },
		});
		await expect(discordFetch('/x')).resolves.toEqual({
			ok: true, status: 200, data: null, error: null,
		});
	});

	it('discordFetch refuse sans TOKEN', async () => {
		delete process.env.TOKEN;
		await expect(discordFetch('/users/@me')).resolves.toEqual({
			ok: false,
			status: 0,
			data: null,
			error: 'TOKEN manquant',
		});
		expect(global.fetch).not.toHaveBeenCalled();
	});

	it('discordFetch GET succès JSON', async () => {
		global.fetch.mockResolvedValue({
			status: 200,
			ok: true,
			text: async () => JSON.stringify({ id: '1' }),
		});
		await expect(discordFetch('/users/@me')).resolves.toEqual({
			ok: true,
			status: 200,
			data: { id: '1' },
			error: null,
		});
		expect(global.fetch).toHaveBeenCalledWith(
			'https://discord.com/api/v10/users/@me',
			expect.objectContaining({
				method: 'GET',
				headers: expect.objectContaining({ Authorization: 'Bot bot-token' }),
			}),
		);
	});

	it('discordFetch POST avec body + 204 + texte non-JSON', async () => {
		global.fetch
			.mockResolvedValueOnce({
				status: 204,
				ok: true,
				text: async () => '',
			})
			.mockResolvedValueOnce({
				status: 200,
				ok: true,
				text: async () => 'plain',
			})
			.mockResolvedValueOnce({
				status: 200,
				ok: true,
				text: async () => '',
			});

		await expect(discordFetch('/x', { method: 'POST', body: { a: 1 } })).resolves.toEqual({
			ok: true, status: 204, data: null, error: null,
		});
		expect(global.fetch.mock.calls[0][1].body).toBe(JSON.stringify({ a: 1 }));

		await expect(discordFetch('/y')).resolves.toEqual({
			ok: true, status: 200, data: 'plain', error: null,
		});
		await expect(discordFetch('/z')).resolves.toEqual({
			ok: true, status: 200, data: null, error: null,
		});
	});

	it('discordFetch erreur HTTP avec text catch', async () => {
		global.fetch.mockResolvedValue({
			status: 403,
			ok: false,
			text: async () => { throw new Error('read fail'); },
		});
		const out = await discordFetch('/guilds/1');
		expect(out.ok).toBe(false);
		expect(out.error).toBe('');
	});

	it('discordFetch erreur HTTP', async () => {
		global.fetch.mockResolvedValue({
			status: 403,
			ok: false,
			text: async () => 'forbidden-long'.repeat(30),
		});
		const out = await discordFetch('/guilds/1');
		expect(out.ok).toBe(false);
		expect(out.status).toBe(403);
		expect(out.error.length).toBeLessThanOrEqual(200);
	});

	it('discordFetch rate-limit puis succès', async () => {
		jest.useFakeTimers();
		global.fetch
			.mockResolvedValueOnce({
				status: 429,
				ok: false,
				json: async () => ({ retry_after: 0.01 }),
			})
			.mockResolvedValueOnce({
				status: 200,
				ok: true,
				text: async () => '{"ok":true}',
			});

		const p = discordFetch('/slow');
		await jest.runAllTimersAsync();
		await expect(p).resolves.toEqual({
			ok: true, status: 200, data: { ok: true }, error: null,
		});
		expect(global.fetch).toHaveBeenCalledTimes(2);
		jest.useRealTimers();
	});

	it('discordFetch rate-limit abandonne après 3 retries', async () => {
		jest.useFakeTimers();
		global.fetch.mockResolvedValue({
			status: 429,
			ok: false,
			json: async () => ({ retry_after: 0.001 }),
		});
		const p = discordFetch('/slow');
		await jest.runAllTimersAsync();
		await expect(p).resolves.toEqual({
			ok: false, status: 429, data: null, error: 'rate limited',
		});
		expect(global.fetch).toHaveBeenCalledTimes(4);
		jest.useRealTimers();
	});

	it('avatarUrl fallback sans discriminator', () => {
		expect(avatarUrl({ id: '123456789012345678' })).toMatch(
			/^https:\/\/cdn\.discordapp\.com\/embed\/avatars\/\d\.png$/,
		);
	});

	it('mapUser fallback display_name sur username/id', () => {
		expect(mapUser({ id: '42', username: 'fox' })).toMatchObject({
			display_name: 'fox',
		});
		expect(mapUser({ id: '42' })).toMatchObject({
			display_name: '42',
		});
	});

	it('discordFetch rate-limit avec retry_after par défaut si json échoue', async () => {
		jest.useFakeTimers();
		global.fetch
			.mockResolvedValueOnce({
				status: 429,
				ok: false,
				json: async () => { throw new Error('bad json'); },
			})
			.mockResolvedValueOnce({
				status: 200,
				ok: true,
				text: async () => '{"ok":true}',
			});
		const p = discordFetch('/slow');
		await jest.runAllTimersAsync();
		await expect(p).resolves.toEqual({
			ok: true, status: 200, data: { ok: true }, error: null,
		});
		jest.useRealTimers();
	});

	it('wrappers leave/send/channels/guild', async () => {
		global.fetch.mockResolvedValue({
			status: 204,
			ok: true,
			text: async () => '',
		});
		await leaveGuildRest('g1');
		expect(global.fetch).toHaveBeenCalledWith(
			'https://discord.com/api/v10/users/@me/guilds/g1',
			expect.objectContaining({ method: 'DELETE' }),
		);

		global.fetch.mockResolvedValue({
			status: 200,
			ok: true,
			text: async () => '{"id":"m1"}',
		});
		await sendChannelMessage('c1', 'hi');
		expect(global.fetch).toHaveBeenCalledWith(
			'https://discord.com/api/v10/channels/c1/messages',
			expect.objectContaining({
				method: 'POST',
				body: JSON.stringify({ content: 'hi' }),
			}),
		);

		await fetchGuildChannels('g1');
		expect(global.fetch).toHaveBeenCalledWith(
			'https://discord.com/api/v10/guilds/g1/channels',
			expect.any(Object),
		);

		await fetchGuild('g1');
		expect(global.fetch).toHaveBeenCalledWith(
			'https://discord.com/api/v10/guilds/g1',
			expect.any(Object),
		);
	});
});
