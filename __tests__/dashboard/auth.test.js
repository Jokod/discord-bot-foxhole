'use strict';

const {
	hashPassword,
	verifyPassword,
	PASSWORD_MIN,
	assertSameOrigin,
	clientIp,
	cookieSecureFlag,
	trustProxy,
	isLoopbackAddress,
} = require('../../.dashboard/auth');

describe('dashboard auth', () => {
	const prev = {
		origin: process.env.DASHBOARD_PUBLIC_ORIGIN,
		secure: process.env.DASHBOARD_COOKIE_SECURE,
		trust: process.env.DASHBOARD_TRUST_PROXY,
	};

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
});
