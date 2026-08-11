'use strict';

const crypto = require('crypto');

const COOKIE_NAME = 'foxbot_dashboard_sid';
const SESSION_TTL_MS = 12 * 60 * 60 * 1000;
const HASH_KEYLEN = 64;
const SCRYPT_OPTS = { N: 1 << 15, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };
const PASSWORD_MIN = 10;
const PASSWORD_MAX = 128;
const USERNAME_MIN = 3;
const USERNAME_MAX = 64;
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_MAX_ATTEMPTS = 8;
const DEFAULT_USERNAME = 'admin';

const sessions = new Map();
const loginAttempts = new Map();

/** Fixed dummy for constant-time username miss (not a real password). */
const DUMMY_SALT = '00'.repeat(16);
const DUMMY_HASH = crypto.scryptSync('__dummy__', DUMMY_SALT, HASH_KEYLEN, SCRYPT_OPTS).toString('hex');

function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
	const hash = crypto.scryptSync(String(password), salt, HASH_KEYLEN, SCRYPT_OPTS).toString('hex');
	return { salt, hash };
}

function verifyPassword(password, salt, expectedHash) {
	try {
		const { hash } = hashPassword(password, salt);
		const a = Buffer.from(hash, 'hex');
		const b = Buffer.from(String(expectedHash), 'hex');
		if (a.length !== b.length) return false;
		return crypto.timingSafeEqual(a, b);
	}
	catch {
		return false;
	}
}

function trustProxy() {
	return process.env.DASHBOARD_TRUST_PROXY === '1';
}

function isLoopbackAddress(addr) {
	if (!addr) return false;
	const a = String(addr).replace(/^::ffff:/i, '');
	return a === '127.0.0.1' || a === '::1' || a === 'localhost';
}

function clientIp(req) {
	if (trustProxy()) {
		const xf = req.headers['x-forwarded-for'];
		if (typeof xf === 'string' && xf.trim()) return xf.split(',')[0].trim();
	}
	return req.socket?.remoteAddress || 'unknown';
}

function checkLoginRateLimit(req) {
	const ip = clientIp(req);
	const now = Date.now();
	let entry = loginAttempts.get(ip);
	if (!entry || entry.resetAt < now) {
		entry = { count: 0, resetAt: now + LOGIN_WINDOW_MS };
		loginAttempts.set(ip, entry);
	}
	if (entry.count >= LOGIN_MAX_ATTEMPTS) {
		const err = new Error('Too many attempts');
		err.status = 429;
		err.code = 'AUTH_RATE_LIMIT';
		throw err;
	}
	entry.count += 1;
}

function clearLoginRateLimit(req) {
	loginAttempts.delete(clientIp(req));
}

/** Test helper — clears in-memory rate-limit buckets. */
function resetLoginAttemptsForTests() {
	loginAttempts.clear();
}

function validatePasswordStrength(password, username) {
	const pwd = String(password || '');
	if (pwd === 'admin' || pwd.toLowerCase() === String(username || '').toLowerCase()) {
		const err = new Error('Password too weak');
		err.status = 400;
		err.code = 'AUTH_PASS_WEAK';
		throw err;
	}
	if (pwd.length < PASSWORD_MIN) {
		const err = new Error('Password too short');
		err.status = 400;
		err.code = 'AUTH_PASS_SHORT';
		err.params = { min: PASSWORD_MIN };
		throw err;
	}
	if (pwd.length > PASSWORD_MAX) {
		const err = new Error('Password too long');
		err.status = 400;
		err.code = 'AUTH_PASS_LONG';
		throw err;
	}
}

function authCollection() {
	return require('mongoose').connection.db.collection('dashboard_auth');
}

/**
 * Seed credentials once. Default login is admin / admin until the operator
 * changes it in Profile (isDefault blocks data APIs until then).
 * Never rotates an existing password and never logs secrets.
 */
async function ensureDefaultAdmin() {
	const col = authCollection();
	const existing = await col.findOne({ _id: 'credentials' });
	if (existing) return existing;

	const { salt, hash } = hashPassword('admin');
	const doc = {
		_id: 'credentials',
		username: DEFAULT_USERNAME,
		salt,
		hash,
		isDefault: true,
		updatedAt: new Date(),
	};
	await col.insertOne(doc);
	console.log(
		`[dashboard] Auth seeded — default user ${DEFAULT_USERNAME} `
		+ '(change password in Profile before data APIs)',
	);
	return doc;
}

async function getCredentials() {
	await ensureDefaultAdmin();
	return authCollection().findOne({ _id: 'credentials' });
}

async function validateLogin(username, password, req) {
	checkLoginRateLimit(req);
	const creds = await getCredentials();
	const userOk = creds && creds.username === String(username || '');
	const salt = userOk ? creds.salt : DUMMY_SALT;
	const expected = userOk ? creds.hash : DUMMY_HASH;
	const passOk = verifyPassword(password, salt, expected);
	if (!userOk || !passOk) return null;
	clearLoginRateLimit(req);
	const now = new Date();
	await authCollection().updateOne(
		{ _id: 'credentials' },
		{ $set: { lastLoginAt: now } },
	);
	return {
		username: creds.username,
		isDefault: Boolean(creds.isDefault),
		lastLoginAt: now,
		updatedAt: creds.updatedAt || null,
	};
}

async function updateCredentials({ currentPassword, username, newPassword }) {
	const creds = await getCredentials();
	if (!verifyPassword(currentPassword, creds.salt, creds.hash)) {
		const err = new Error('Current password incorrect');
		err.status = 403;
		err.code = 'AUTH_FORBIDDEN_PASSWORD';
		throw err;
	}

	const nextUser = username != null ? String(username).trim() : creds.username;
	if (!nextUser || nextUser.length < USERNAME_MIN) {
		const err = new Error('Username too short');
		err.status = 400;
		err.code = 'AUTH_USER_SHORT';
		throw err;
	}
	if (nextUser.length > USERNAME_MAX) {
		const err = new Error('Username too long');
		err.status = 400;
		err.code = 'AUTH_USER_LONG';
		throw err;
	}
	if (!/^[a-zA-Z0-9._-]+$/.test(nextUser)) {
		const err = new Error('Invalid username chars');
		err.status = 400;
		err.code = 'AUTH_USER_CHARS';
		throw err;
	}

	const update = {
		username: nextUser,
		isDefault: false,
		updatedAt: new Date(),
	};

	const mustSetPassword = creds.isDefault || (newPassword != null && String(newPassword).length > 0);
	if (creds.isDefault && (!newPassword || String(newPassword).length === 0)) {
		const err = new Error('New password required');
		err.status = 400;
		err.code = 'AUTH_PASS_REQUIRED';
		throw err;
	}

	if (mustSetPassword) {
		validatePasswordStrength(newPassword, nextUser);
		const hashed = hashPassword(newPassword);
		update.salt = hashed.salt;
		update.hash = hashed.hash;
	}

	await authCollection().updateOne({ _id: 'credentials' }, { $set: update });
	destroyAllSessions();
	return {
		username: update.username,
		isDefault: false,
		updatedAt: update.updatedAt,
	};
}

function pruneExpiredSessions() {
	const now = Date.now();
	for (const [sid, session] of sessions) {
		if (session.expiresAt < now) sessions.delete(sid);
	}
}

function activeSessionCount() {
	pruneExpiredSessions();
	return sessions.size;
}

function createSession(user, req = null) {
	const sid = crypto.randomBytes(32).toString('hex');
	const now = Date.now();
	sessions.set(sid, {
		username: user.username,
		isDefault: Boolean(user.isDefault),
		createdAt: now,
		lastSeenAt: now,
		expiresAt: now + SESSION_TTL_MS,
		ip: req ? clientIp(req) : null,
	});
	return sid;
}

function describeSession(session) {
	if (!session) return null;
	return {
		started_at: session.createdAt ? new Date(session.createdAt).toISOString() : null,
		expires_at: new Date(session.expiresAt).toISOString(),
		ip: session.ip || null,
		active_sessions: activeSessionCount(),
		ttl_hours: Math.round(SESSION_TTL_MS / (60 * 60 * 1000)),
	};
}

function destroySession(sid) {
	if (sid) sessions.delete(sid);
}

function destroyAllSessions() {
	sessions.clear();
}

function getSession(sid) {
	if (!sid || !/^[a-f0-9]{64}$/.test(sid)) return null;
	const session = sessions.get(sid);
	if (!session) return null;
	if (session.expiresAt < Date.now()) {
		sessions.delete(sid);
		return null;
	}
	const now = Date.now();
	session.lastSeenAt = now;
	session.expiresAt = now + SESSION_TTL_MS;
	return session;
}

function parseCookies(req) {
	const header = req.headers.cookie || '';
	const out = {};
	for (const part of header.split(';')) {
		const idx = part.indexOf('=');
		if (idx === -1) continue;
		const key = part.slice(0, idx).trim();
		const val = part.slice(idx + 1).trim();
		if (key) {
			try {
				out[key] = decodeURIComponent(val);
			}
			catch {
				out[key] = val;
			}
		}
	}
	return out;
}

function sessionIdFromReq(req) {
	return parseCookies(req)[COOKIE_NAME] || null;
}

function cookieSecureFlag() {
	const flag = process.env.DASHBOARD_COOKIE_SECURE;
	if (flag === '1') return '; Secure';
	if (flag === '0') return '';
	const publicOrigin = (process.env.DASHBOARD_PUBLIC_ORIGIN || '').trim().toLowerCase();
	if (publicOrigin.startsWith('https://')) return '; Secure';
	return '';
}

function setSessionCookie(res, sid) {
	const maxAge = Math.floor(SESSION_TTL_MS / 1000);
	res.setHeader(
		'Set-Cookie',
		`${COOKIE_NAME}=${encodeURIComponent(sid)}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${cookieSecureFlag()}`,
	);
}

function clearSessionCookie(res) {
	res.setHeader(
		'Set-Cookie',
		`${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0${cookieSecureFlag()}`,
	);
}

function requireSession(req) {
	return getSession(sessionIdFromReq(req));
}

/**
 * Reject cross-site POSTs (CSRF).
 * Origin is required except from loopback (local tooling).
 * Behind a reverse proxy, set DASHBOARD_PUBLIC_ORIGIN to the public URL.
 * X-Forwarded-Host is never trusted (spoofable).
 */
function assertSameOrigin(req) {
	const origin = req.headers.origin;
	if (!origin) {
		if (isLoopbackAddress(req.socket?.remoteAddress)) return;
		const err = new Error('Origin required');
		err.status = 403;
		err.code = 'AUTH_ORIGIN';
		throw err;
	}

	let originHost;
	try {
		originHost = new URL(origin).host;
	}
	catch {
		const err = new Error('Invalid origin');
		err.status = 403;
		err.code = 'AUTH_ORIGIN';
		throw err;
	}

	const allowed = new Set();
	const publicOrigin = (process.env.DASHBOARD_PUBLIC_ORIGIN || '').trim();
	if (publicOrigin) {
		try {
			allowed.add(new URL(publicOrigin).host);
		}
		catch {
			const err = new Error('Invalid DASHBOARD_PUBLIC_ORIGIN');
			err.status = 500;
			err.code = 'AUTH_ORIGIN';
			throw err;
		}
	}
	const host = req.headers.host;
	if (host) allowed.add(host);

	if (!allowed.size || !allowed.has(originHost)) {
		const err = new Error('Origin rejected');
		err.status = 403;
		err.code = 'AUTH_ORIGIN';
		throw err;
	}
}

module.exports = {
	COOKIE_NAME,
	PASSWORD_MIN,
	SESSION_TTL_MS,
	DEFAULT_USERNAME,
	hashPassword,
	verifyPassword,
	validatePasswordStrength,
	ensureDefaultAdmin,
	getCredentials,
	validateLogin,
	updateCredentials,
	createSession,
	describeSession,
	activeSessionCount,
	destroySession,
	destroyAllSessions,
	getSession,
	sessionIdFromReq,
	setSessionCookie,
	clearSessionCookie,
	requireSession,
	assertSameOrigin,
	checkLoginRateLimit,
	clientIp,
	cookieSecureFlag,
	trustProxy,
	isLoopbackAddress,
	resetLoginAttemptsForTests,
};
