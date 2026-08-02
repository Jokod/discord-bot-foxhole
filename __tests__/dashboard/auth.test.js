'use strict';

jest.mock('mongoose', () => ({
	connection: {
		db: {
			collection: jest.fn(),
		},
	},
}));

const mongoose = require('mongoose');
const {
	hashPassword,
	verifyPassword,
	PASSWORD_MIN,
	assertSameOrigin,
	clientIp,
	cookieSecureFlag,
	trustProxy,
	isLoopbackAddress,
	ensureDefaultAdmin,
	validateLogin,
	updateCredentials,
	createSession,
	getSession,
	destroySession,
	destroyAllSessions,
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
		expect(ok).toEqual({ username: 'admin', isDefault: true });
		expect(await validateLogin('admin', 'wrong', req)).toBeNull();
		expect(await validateLogin('nope', 'admin', req)).toBeNull();
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
		expect(updated).toEqual({ username: 'ops', isDefault: false });
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
});
