'use strict';

jest.mock('../../utils/discordRest', () => ({
	avatarUrl: jest.fn((user) => (user?.avatar ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=64` : null)),
	discordFetch: jest.fn(),
}));

const { discordFetch } = require('../../utils/discordRest');
const {
	isDiscordUserId,
	proxyAvatarUrl,
	withProxyAvatar,
	serveAvatar,
	resetAvatarCacheForTests,
} = require('../../.dashboard/lib/discordAvatar');

describe('dashboard discordAvatar', () => {
	const prevFetch = global.fetch;

	beforeEach(() => {
		resetAvatarCacheForTests();
		jest.clearAllMocks();
		global.fetch = jest.fn();
	});

	afterAll(() => {
		global.fetch = prevFetch;
	});

	it('isDiscordUserId validates snowflakes', () => {
		expect(isDiscordUserId('123456789012345678')).toBe(true);
		expect(isDiscordUserId('abc')).toBe(false);
		expect(isDiscordUserId('')).toBe(false);
	});

	it('withProxyAvatar rewrites CDN urls to same-origin proxy', () => {
		expect(withProxyAvatar({
			user_id: '123456789012345678',
			avatar_url: 'https://cdn.discordapp.com/avatars/x/y.png',
		})).toMatchObject({ avatar_url: '/api/avatar/123456789012345678' });
		expect(withProxyAvatar({
			user_id: '123456789012345678',
			avatar_url: null,
		})).toMatchObject({ avatar_url: null });
	});

	it('proxyAvatarUrl returns dashboard path', () => {
		expect(proxyAvatarUrl('123456789012345678')).toBe('/api/avatar/123456789012345678');
		expect(proxyAvatarUrl('bad')).toBeNull();
	});

	it('serveAvatar streams upstream image and caches it', async () => {
		discordFetch.mockResolvedValueOnce({
			ok: true,
			data: { id: '123456789012345678', avatar: 'abc' },
		});
		global.fetch.mockResolvedValueOnce({
			ok: true,
			headers: { get: () => 'image/png' },
			arrayBuffer: async () => Uint8Array.from([137, 80, 78, 71]).buffer,
		});

		const res = {
			writeHead: jest.fn(),
			end: jest.fn(),
		};
		await serveAvatar('123456789012345678', res);

		expect(res.writeHead).toHaveBeenCalledWith(200, expect.objectContaining({
			'Content-Type': 'image/png',
			'Cache-Control': 'public, max-age=86400',
		}));
		expect(res.end).toHaveBeenCalledWith(expect.any(Buffer));
		expect(global.fetch).toHaveBeenCalledTimes(1);

		res.writeHead.mockClear();
		res.end.mockClear();
		await serveAvatar('123456789012345678', res);
		expect(global.fetch).toHaveBeenCalledTimes(1);
		expect(res.end).toHaveBeenCalled();
	});

	it('serveAvatar returns 404 when user is unknown', async () => {
		discordFetch.mockResolvedValueOnce({ ok: false, status: 404, data: null });
		const res = { writeHead: jest.fn(), end: jest.fn() };
		await serveAvatar('123456789012345678', res);
		expect(res.writeHead).toHaveBeenCalledWith(404, expect.any(Object));
	});

	it('serveAvatar returns 400 for invalid user id', async () => {
		const res = { writeHead: jest.fn(), end: jest.fn() };
		await serveAvatar('bad-id', res);
		expect(res.writeHead).toHaveBeenCalledWith(400, expect.any(Object));
	});

	it('serveAvatar default content-type when upstream omits header', async () => {
		discordFetch.mockResolvedValueOnce({
			ok: true,
			data: { id: '123456789012345678', avatar: 'abc' },
		});
		global.fetch.mockResolvedValueOnce({
			ok: true,
			headers: { get: () => null },
			arrayBuffer: async () => Uint8Array.from([137, 80, 78, 71]).buffer,
		});
		const res = { writeHead: jest.fn(), end: jest.fn() };
		await serveAvatar('123456789012345678', res);
		expect(res.writeHead).toHaveBeenCalledWith(200, expect.objectContaining({
			'Content-Type': 'image/png',
		}));
	});

	it('serveAvatar returns 502 when upstream image fetch fails', async () => {
		discordFetch.mockResolvedValueOnce({
			ok: true,
			data: { id: '123456789012345678', avatar: 'abc' },
		});
		global.fetch.mockResolvedValueOnce({ ok: false });
		const res = { writeHead: jest.fn(), end: jest.fn() };
		await serveAvatar('123456789012345678', res);
		expect(res.writeHead).toHaveBeenCalledWith(502, expect.any(Object));
	});

	it('withProxyAvatar returns user unchanged without user_id', () => {
		expect(withProxyAvatar({ avatar_url: 'x' })).toEqual({ avatar_url: 'x' });
		expect(withProxyAvatar(null)).toBeNull();
	});
});
