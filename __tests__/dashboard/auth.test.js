'use strict';

jest.mock('mongoose', () => ({
	connection: {
		db: {
			collection: jest.fn(),
		},
	},
}));

const crypto = require('crypto');
const mongoose = require('mongoose');
const {
	hashPassword,
	verifyPassword,
	PASSWORD_MIN,
	COOKIE_NAME,
	SESSION_TTL_MS,
	assertSameOrigin,
	clientIp,
	cookieSecureFlag,
	trustProxy,
	isLoopbackAddress,
	ensureDefaultAdmin,
	validateLogin,
	updateCredentials,
	validatePasswordStrength,
	createSession,
	describeSession,
	activeSessionCount,
	getSession,
	destroySession,
	destroyAllSessions,
	sessionIdFromReq,
	setSessionCookie,
	clearSessionCookie,
	requireSession,
	resetLoginAttemptsForTests,
	DEFAULT_USERNAME,
} = require('../../.dashboard/auth');

describe('dashboard auth', () => {
	const prev = {
		origin: process.env.DASHBOARD_PUBLIC_ORIGIN,
		secure: process.env.DASHBOARD_COOKIE_SECURE,
		trust: process.env.DASHBOARD_TRUST_PROXY,
	};

	let store;
	let col;

	beforeEach(() => {
		resetLoginAttemptsForTests();
		destroyAllSessions();
		store = null;
		col = {
			findOne: jest.fn(async () => store),
			insertOne: jest.fn(async (doc) => {
				store = { ...doc };
				return { acknowledged: true };
			}),
			updateOne: jest.fn(async (_q, update) => {
				store = { ...(store || { _id: 'credentials' }), ...update.$set };
				return { acknowledged: true };
			}),
		};
		mongoose.connection.db.collection.mockReturnValue(col);
	});

	afterEach(() => {
		for (const [key, envKey] of [
			['origin', 'DASHBOARD_PUBLIC_ORIGIN'],
			['secure', 'DASHBOARD_COOKIE_SECURE'],
			['trust', 'DASHBOARD_TRUST_PROXY'],
		]) {
			if (prev[key] === undefined) delete process.env[envKey];
			else process.env[envKey] = prev[key];
		}
	});

	it('hashes and verifies password', () => {
		const { salt, hash } = hashPassword('secret-ok-12');
		expect(salt).toHaveLength(32);
		expect(hash).toHaveLength(128);
		expect(verifyPassword('secret-ok-12', salt, hash)).toBe(true);
		expect(verifyPassword('wrong', salt, hash)).toBe(false);
	});

	it('verifyPassword returns false when hash lengths differ', () => {
		const { salt, hash } = hashPassword('secret-ok-12');
		const shortHash = hash.slice(0, hash.length - 2);
		expect(verifyPassword('secret-ok-12', salt, shortHash)).toBe(false);
	});

	it('verifyPassword returns false when scryptSync throws', () => {
		const spy = jest.spyOn(crypto, 'scryptSync').mockImplementation(() => {
			throw new Error('scrypt fail');
		});
		expect(verifyPassword('any', 'a'.repeat(32), 'b'.repeat(128))).toBe(false);
		spy.mockRestore();
	});

	it('uses provided salt reproducibly', () => {
		const salt = 'a'.repeat(32);
		const a = hashPassword('secret-ok-12', salt);
		const b = hashPassword('secret-ok-12', salt);
		expect(a.hash).toBe(b.hash);
	});

	it('exposes password minimum length', () => {
		expect(PASSWORD_MIN).toBeGreaterThanOrEqual(10);
	});

	it('assertSameOrigin allows missing Origin from loopback', () => {
		expect(() => assertSameOrigin({
			headers: { host: '127.0.0.1:3847' },
			socket: { remoteAddress: '127.0.0.1' },
		})).not.toThrow();
	});

	it('assertSameOrigin rejects missing Origin from non-loopback', () => {
		expect(() => assertSameOrigin({
			headers: { host: '127.0.0.1:3847' },
			socket: { remoteAddress: '10.0.0.5' },
		})).toThrow(/Origin required/);
	});

	it('assertSameOrigin accepts Host match', () => {
		expect(() => assertSameOrigin({
			headers: { host: '127.0.0.1:3847', origin: 'http://127.0.0.1:3847' },
			socket: { remoteAddress: '10.0.0.5' },
		})).not.toThrow();
	});

	it('assertSameOrigin accepts host-only when public origin unset', () => {
		delete process.env.DASHBOARD_PUBLIC_ORIGIN;
		expect(() => assertSameOrigin({
			headers: { host: 'dashboard.local:3847', origin: 'http://dashboard.local:3847' },
			socket: { remoteAddress: '10.0.0.5' },
		})).not.toThrow();
	});

	it('assertSameOrigin accepts DASHBOARD_PUBLIC_ORIGIN behind proxy', () => {
		process.env.DASHBOARD_PUBLIC_ORIGIN = 'https://stats.example.com';
		expect(() => assertSameOrigin({
			headers: { host: '127.0.0.1:3847', origin: 'https://stats.example.com' },
			socket: { remoteAddress: '10.0.0.5' },
		})).not.toThrow();
	});

	it('assertSameOrigin rejects foreign Origin', () => {
		delete process.env.DASHBOARD_PUBLIC_ORIGIN;
		expect(() => assertSameOrigin({
			headers: { host: '127.0.0.1:3847', origin: 'https://evil.example' },
			socket: { remoteAddress: '10.0.0.5' },
		})).toThrow(/Origin rejected/);
	});

	it('assertSameOrigin rejects invalid Origin URL', () => {
		expect(() => assertSameOrigin({
			headers: { host: '127.0.0.1:3847', origin: 'not-a-valid-url' },
			socket: { remoteAddress: '10.0.0.5' },
		})).toThrow(/Invalid origin/);
	});

	it('assertSameOrigin rejects invalid DASHBOARD_PUBLIC_ORIGIN', () => {
		process.env.DASHBOARD_PUBLIC_ORIGIN = 'not-a-valid-url';
		expect(() => assertSameOrigin({
			headers: { host: '127.0.0.1:3847', origin: 'http://127.0.0.1:3847' },
			socket: { remoteAddress: '10.0.0.5' },
		})).toThrow(/Invalid DASHBOARD_PUBLIC_ORIGIN/);
	});

	it('assertSameOrigin ignores spoofed X-Forwarded-Host', () => {
		delete process.env.DASHBOARD_PUBLIC_ORIGIN;
		expect(() => assertSameOrigin({
			headers: {
				host: '127.0.0.1:3847',
				origin: 'https://evil.example',
				'x-forwarded-host': 'evil.example',
			},
			socket: { remoteAddress: '10.0.0.5' },
		})).toThrow(/Origin rejected/);
	});

	it('clientIp ignores X-Forwarded-For unless TRUST_PROXY', () => {
		delete process.env.DASHBOARD_TRUST_PROXY;
		expect(trustProxy()).toBe(false);
		expect(clientIp({
			headers: { 'x-forwarded-for': '1.2.3.4' },
			socket: { remoteAddress: '10.0.0.9' },
		})).toBe('10.0.0.9');

		process.env.DASHBOARD_TRUST_PROXY = '1';
		expect(clientIp({
			headers: { 'x-forwarded-for': '1.2.3.4, 10.0.0.1' },
			socket: { remoteAddress: '10.0.0.9' },
		})).toBe('1.2.3.4');
	});

	it('cookieSecureFlag follows https PUBLIC_ORIGIN and explicit override', () => {
		delete process.env.DASHBOARD_COOKIE_SECURE;
		delete process.env.DASHBOARD_PUBLIC_ORIGIN;
		expect(cookieSecureFlag()).toBe('');

		process.env.DASHBOARD_PUBLIC_ORIGIN = 'https://stats.example.com';
		expect(cookieSecureFlag()).toBe('; Secure');

		process.env.DASHBOARD_COOKIE_SECURE = '0';
		expect(cookieSecureFlag()).toBe('');

		process.env.DASHBOARD_COOKIE_SECURE = '1';
		process.env.DASHBOARD_PUBLIC_ORIGIN = 'http://stats.example.com';
		expect(cookieSecureFlag()).toBe('; Secure');
	});

	it('isLoopbackAddress recognizes ipv4/ipv6 forms', () => {
		expect(isLoopbackAddress('127.0.0.1')).toBe(true);
		expect(isLoopbackAddress('::1')).toBe(true);
		expect(isLoopbackAddress('::ffff:127.0.0.1')).toBe(true);
		expect(isLoopbackAddress('10.0.0.1')).toBe(false);
		expect(isLoopbackAddress(null)).toBe(false);
		expect(isLoopbackAddress('localhost')).toBe(true);
	});

	it('clientIp returns unknown without socket address', () => {
		expect(clientIp({ headers: {} })).toBe('unknown');
	});

	it('clientIp ignores empty X-Forwarded-For when trust proxy', () => {
		process.env.DASHBOARD_TRUST_PROXY = '1';
		expect(clientIp({
			headers: { 'x-forwarded-for': '   ' },
			socket: { remoteAddress: '10.0.0.9' },
		})).toBe('10.0.0.9');
	});

	it('ensureDefaultAdmin seeds admin/admin once', async () => {
		const doc = await ensureDefaultAdmin();
		expect(doc.username).toBe(DEFAULT_USERNAME);
		expect(doc.isDefault).toBe(true);
		expect(verifyPassword('admin', doc.salt, doc.hash)).toBe(true);
		expect(col.insertOne).toHaveBeenCalledTimes(1);

		const again = await ensureDefaultAdmin();
		expect(again).toEqual(doc);
		expect(col.insertOne).toHaveBeenCalledTimes(1);
	});

	it('validateLogin accepts default credentials and rejects bad password', async () => {
		await ensureDefaultAdmin();
		const req = { headers: {}, socket: { remoteAddress: '127.0.0.1' } };
		const ok = await validateLogin('admin', 'admin', req);
		expect(ok).toEqual({
			username: 'admin',
			isDefault: true,
			lastLoginAt: expect.any(Date),
			updatedAt: expect.any(Date),
		});
		expect(await validateLogin('admin', 'wrong', req)).toBeNull();
		expect(await validateLogin('nope', 'admin', req)).toBeNull();
	});

	it('validateLogin returns null updatedAt when credentials lack timestamps', async () => {
		const seeded = hashPassword('admin');
		store = {
			_id: 'credentials',
			username: 'admin',
			salt: seeded.salt,
			hash: seeded.hash,
			isDefault: true,
		};
		col.findOne.mockImplementation(async () => store);
		const req = { headers: {}, socket: { remoteAddress: '127.0.0.1' } };
		const ok = await validateLogin('admin', 'admin', req);
		expect(ok.updatedAt).toBeNull();
	});

	it('validateLogin rate-limits after too many attempts', async () => {
		await ensureDefaultAdmin();
		const req = { headers: {}, socket: { remoteAddress: '10.9.8.7' } };
		for (let i = 0; i < 8; i += 1) {
			await validateLogin('admin', 'wrong', req);
		}
		await expect(validateLogin('admin', 'wrong', req)).rejects.toMatchObject({
			status: 429,
			code: 'AUTH_RATE_LIMIT',
		});
	});

	it('updateCredentials requires new password while isDefault and clears sessions', async () => {
		await ensureDefaultAdmin();
		const sid = createSession({ username: 'admin', isDefault: true });
		expect(getSession(sid)).toBeTruthy();

		await expect(updateCredentials({
			currentPassword: 'admin',
			username: 'admin',
			newPassword: '',
		})).rejects.toMatchObject({ code: 'AUTH_PASS_REQUIRED' });

		const updated = await updateCredentials({
			currentPassword: 'admin',
			username: 'ops',
			newPassword: 'strong-pass-12',
		});
		expect(updated).toEqual({ username: 'ops', isDefault: false, updatedAt: expect.any(Date) });
		expect(store.isDefault).toBe(false);
		expect(verifyPassword('strong-pass-12', store.salt, store.hash)).toBe(true);
		expect(getSession(sid)).toBeNull();
	});

	it('updateCredentials rejects wrong current password and weak new password', async () => {
		await ensureDefaultAdmin();
		await expect(updateCredentials({
			currentPassword: 'nope',
			username: 'admin',
			newPassword: 'strong-pass-12',
		})).rejects.toMatchObject({ code: 'AUTH_FORBIDDEN_PASSWORD' });

		await expect(updateCredentials({
			currentPassword: 'admin',
			username: 'opsleader1',
			newPassword: 'opsleader1',
		})).rejects.toMatchObject({ code: 'AUTH_PASS_WEAK' });
	});

	it('updateCredentials rejects password too short or too long', async () => {
		await ensureDefaultAdmin();
		await expect(updateCredentials({
			currentPassword: 'admin',
			username: 'validuser',
			newPassword: 'short',
		})).rejects.toMatchObject({ code: 'AUTH_PASS_SHORT', params: { min: PASSWORD_MIN } });

		await expect(updateCredentials({
			currentPassword: 'admin',
			username: 'validuser',
			newPassword: 'a'.repeat(129),
		})).rejects.toMatchObject({ code: 'AUTH_PASS_LONG' });

		await expect(updateCredentials({
			currentPassword: 'admin',
			username: 'validuser1',
			newPassword: 'validuser1',
		})).rejects.toMatchObject({ code: 'AUTH_PASS_WEAK' });
	});

	it('updateCredentials can rotate password after default is cleared', async () => {
		await ensureDefaultAdmin();
		await updateCredentials({
			currentPassword: 'admin',
			username: 'ops',
			newPassword: 'strong-pass-12',
		});
		const updated = await updateCredentials({
			currentPassword: 'strong-pass-12',
			username: 'ops',
			newPassword: 'another-pass-12',
		});
		expect(updated.username).toBe('ops');
		expect(verifyPassword('another-pass-12', store.salt, store.hash)).toBe(true);
	});

	it('updateCredentials keeps username when omitted', async () => {
		await ensureDefaultAdmin();
		await updateCredentials({
			currentPassword: 'admin',
			username: 'ops',
			newPassword: 'strong-pass-12',
		});
		const updated = await updateCredentials({
			currentPassword: 'strong-pass-12',
			newPassword: 'another-pass-12',
		});
		expect(updated.username).toBe('ops');
	});

	it('updateCredentials rejects password admin literal', async () => {
		await ensureDefaultAdmin();
		await expect(updateCredentials({
			currentPassword: 'admin',
			username: 'opsleader1',
			newPassword: 'admin',
		})).rejects.toMatchObject({ code: 'AUTH_PASS_WEAK' });
	});

	it('validatePasswordStrength rejects falsy password/username pairs', () => {
		expect(() => validatePasswordStrength(null, null)).toThrow(/weak/i);
		expect(() => validatePasswordStrength(undefined, undefined)).toThrow(/weak/i);
		expect(() => validatePasswordStrength('', '')).toThrow(/weak/i);
		expect(() => validatePasswordStrength('admin', 'anyone')).toThrow(/weak/i);
	});

	it('updateCredentials can change username without new password when not default', async () => {
		await ensureDefaultAdmin();
		await updateCredentials({
			currentPassword: 'admin',
			username: 'ops',
			newPassword: 'strong-pass-12',
		});
		const updated = await updateCredentials({
			currentPassword: 'strong-pass-12',
			username: 'ops-renamed',
		});
		expect(updated.username).toBe('ops-renamed');
		expect(store.username).toBe('ops-renamed');
	});

	it('updateCredentials rejects invalid username', async () => {
		await ensureDefaultAdmin();
		await expect(updateCredentials({
			currentPassword: 'admin',
			username: 'ab',
			newPassword: 'strong-pass-12',
		})).rejects.toMatchObject({ code: 'AUTH_USER_SHORT' });

		await expect(updateCredentials({
			currentPassword: 'admin',
			username: 'a'.repeat(65),
			newPassword: 'strong-pass-12',
		})).rejects.toMatchObject({ code: 'AUTH_USER_LONG' });

		await expect(updateCredentials({
			currentPassword: 'admin',
			username: 'bad@user',
			newPassword: 'strong-pass-12',
		})).rejects.toMatchObject({ code: 'AUTH_USER_CHARS' });
	});

	it('destroySession ignores falsy sid', () => {
		createSession({ username: 'admin', isDefault: false });
		expect(activeSessionCount()).toBe(1);
		destroySession(null);
		destroySession('');
		expect(activeSessionCount()).toBe(1);
	});

	it('activeSessionCount keeps non-expired sessions during prune', () => {
		const sid = createSession({ username: 'admin', isDefault: false });
		expect(activeSessionCount()).toBe(1);
		expect(getSession(sid)).toBeTruthy();
		expect(activeSessionCount()).toBe(1);
	});

	it('sessionIdFromReq ignores cookie parts without key', () => {
		expect(sessionIdFromReq({
			headers: { cookie: '=orphan-only' },
		})).toBeNull();
	});

	it('assertSameOrigin rejects when no host and no public origin', () => {
		delete process.env.DASHBOARD_PUBLIC_ORIGIN;
		expect(() => assertSameOrigin({
			headers: { origin: 'http://127.0.0.1:3847' },
			socket: { remoteAddress: '10.0.0.5' },
		})).toThrow(/Origin rejected/);
	});

	it('validateLogin uses dummy hash when username unknown', async () => {
		await ensureDefaultAdmin();
		const req = { headers: {}, socket: { remoteAddress: '127.0.0.1' } };
		expect(await validateLogin('', 'any-password-here', req)).toBeNull();
	});

	it('sessions create, expire check, and destroy', () => {
		const sid = createSession({ username: 'admin', isDefault: false });
		expect(sid).toMatch(/^[a-f0-9]{64}$/);
		expect(getSession(sid).username).toBe('admin');
		expect(getSession('not-a-sid')).toBeNull();
		destroySession(sid);
		expect(getSession(sid)).toBeNull();
		const sid2 = createSession({ username: 'admin', isDefault: false });
		destroyAllSessions();
		expect(getSession(sid2)).toBeNull();
	});

	it('describeSession returns null for missing session and fields for valid session', () => {
		expect(describeSession(null)).toBeNull();
		const sid = createSession(
			{ username: 'admin', isDefault: false },
			{ headers: {}, socket: { remoteAddress: '127.0.0.1' } },
		);
		const session = getSession(sid);
		expect(describeSession(session)).toEqual({
			started_at: expect.any(String),
			expires_at: expect.any(String),
			ip: '127.0.0.1',
			active_sessions: 1,
			ttl_hours: Math.round(SESSION_TTL_MS / (60 * 60 * 1000)),
		});
	});

	it('describeSession tolerates missing createdAt', () => {
		const sid = createSession({ username: 'admin', isDefault: false });
		const session = getSession(sid);
		session.createdAt = 0;
		expect(describeSession(session).started_at).toBeNull();
	});

	it('activeSessionCount prune expired and keeps active in same pass', () => {
		jest.useFakeTimers();
		createSession({ username: 'expired', isDefault: false });
		jest.advanceTimersByTime(SESSION_TTL_MS / 2);
		const sidActive = createSession({ username: 'active', isDefault: false });
		jest.advanceTimersByTime(SESSION_TTL_MS / 2 + 1);
		expect(activeSessionCount()).toBe(1);
		expect(getSession(sidActive)).toBeTruthy();
		jest.useRealTimers();
	});

	it('activeSessionCount prunes expired sessions', () => {
		jest.useFakeTimers();
		const sid = createSession({ username: 'admin', isDefault: false });
		expect(activeSessionCount()).toBe(1);
		jest.advanceTimersByTime(SESSION_TTL_MS + 1);
		expect(getSession(sid)).toBeNull();
		expect(activeSessionCount()).toBe(0);
		jest.useRealTimers();
	});

	it('sessionIdFromReq parses cookies with decodeURIComponent and malformed escapes', () => {
		const sid = 'a'.repeat(64);
		expect(sessionIdFromReq({
			headers: { cookie: `${COOKIE_NAME}=${encodeURIComponent(sid)}` },
		})).toBe(sid);

		expect(sessionIdFromReq({
			headers: { cookie: `${COOKIE_NAME}=%ZZ` },
		})).toBe('%ZZ');

		expect(sessionIdFromReq({ headers: {} })).toBeNull();
	});

	it('setSessionCookie and clearSessionCookie set Set-Cookie header', () => {
		const sid = 'b'.repeat(64);
		const res = { setHeader: jest.fn() };
		setSessionCookie(res, sid);
		expect(res.setHeader).toHaveBeenCalledWith(
			'Set-Cookie',
			expect.stringContaining(`${COOKIE_NAME}=${encodeURIComponent(sid)}`),
		);
		expect(res.setHeader.mock.calls[0][1]).toMatch(/Max-Age=\d+/);

		clearSessionCookie(res);
		expect(res.setHeader).toHaveBeenLastCalledWith(
			'Set-Cookie',
			expect.stringContaining(`${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0`),
		);
	});

	it('requireSession resolves session from cookie header', () => {
		const sid = createSession({ username: 'ops', isDefault: false });
		const session = requireSession({
			headers: { cookie: `${COOKIE_NAME}=${sid}` },
		});
		expect(session.username).toBe('ops');
		expect(requireSession({ headers: {} })).toBeNull();
	});
});
