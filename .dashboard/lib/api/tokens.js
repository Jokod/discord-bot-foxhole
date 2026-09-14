'use strict';

const crypto = require('crypto');
const mongoose = require('../db');

const JWT_ALG = 'HS256';
const CLOCK_SKEW_SEC = 60;
const LABEL_MAX = 64;
const MAX_ACTIVE_TOKENS = 10;
const MAX_CREATES_PER_HOUR = 5;
const HOUR_MS = 60 * 60 * 1000;
const ALLOWED_EXPIRY_DAYS = new Set([7, 30, 90, 365]);
const ALLOWED_SCOPES = ['materials', 'data', 'guilds'];
const PLACEHOLDER_SECRETS = new Set([
	'change-me',
	'changeme',
	'your-secret-here',
	'secret',
	'test',
	'dev',
]);

const createAttemptsBySession = new Map();

function tokensCollection() {
	return mongoose.connection.db.collection('dashboard_api_tokens');
}

function b64url(input) {
	return Buffer.from(input)
		.toString('base64')
		.replace(/\+/g, '-')
		.replace(/\//g, '_')
		.replace(/=+$/, '');
}

function b64urlDecode(str) {
	const pad = str.length % 4 === 0 ? '' : '='.repeat(4 - (str.length % 4));
	return Buffer.from(str.replace(/-/g, '+').replace(/_/g, '/') + pad, 'base64');
}

function isApiMasterEnabled(env = process.env) {
	return env.DASHBOARD_API === '1';
}

function enabledScopes(env = process.env) {
	if (!isApiMasterEnabled(env)) return [];
	const scopes = [];
	if (env.DASHBOARD_API_MATERIALS === '1') scopes.push('materials');
	if (env.DASHBOARD_API_DATA === '1') scopes.push('data');
	if (env.DASHBOARD_API_GUILDS === '1') scopes.push('guilds');
	return scopes;
}

function isDocsEnabled(env = process.env) {
	return isApiMasterEnabled(env) && env.DASHBOARD_API_DOCS === '1';
}

function getJwtSecret(env = process.env) {
	return String(env.DASHBOARD_API_JWT_SECRET || '');
}

function validateJwtSecretAtBoot(env = process.env) {
	if (!isApiMasterEnabled(env)) return;
	const secret = getJwtSecret(env);
	if (PLACEHOLDER_SECRETS.has(secret.toLowerCase())) {
		throw new Error('DASHBOARD_API_JWT_SECRET is a placeholder — use openssl rand -hex 32');
	}
	if (!secret || secret.length < 32) {
		throw new Error('DASHBOARD_API_JWT_SECRET must be at least 32 bytes when DASHBOARD_API=1');
	}
	const unique = new Set(secret);
	if (unique.size < 8) {
		throw new Error('DASHBOARD_API_JWT_SECRET lacks entropy');
	}
}

function sanitizeLabel(label) {
	const raw = String(label || '').trim().slice(0, LABEL_MAX);
	return [...raw].filter((ch) => {
		const code = ch.charCodeAt(0);
		return code >= 0x20 && code !== 0x7f;
	}).join('');
}

function signJwt(payload, secret) {
	const header = b64url(JSON.stringify({ alg: JWT_ALG, typ: 'JWT' }));
	const body = b64url(JSON.stringify(payload));
	const data = `${header}.${body}`;
	const sig = crypto.createHmac('sha256', secret).update(data).digest();
	return `${data}.${b64url(sig)}`;
}

function verifyJwt(token, secret, nowSec = Math.floor(Date.now() / 1000)) {
	const parts = String(token || '').split('.');
	if (parts.length !== 3) {
		return { ok: false, code: 'API_TOKEN_INVALID' };
	}

	let header;
	try {
		header = JSON.parse(b64urlDecode(parts[0]).toString('utf8'));
	}
	catch {
		return { ok: false, code: 'API_TOKEN_INVALID' };
	}

	if (!header || header.alg !== JWT_ALG) {
		return { ok: false, code: 'API_TOKEN_INVALID' };
	}

	const data = `${parts[0]}.${parts[1]}`;
	const expected = crypto.createHmac('sha256', secret).update(data).digest();
	const actual = b64urlDecode(parts[2]);

	if (expected.length !== actual.length || !crypto.timingSafeEqual(expected, actual)) {
		return { ok: false, code: 'API_TOKEN_INVALID' };
	}

	let payload;
	try {
		payload = JSON.parse(b64urlDecode(parts[1]).toString('utf8'));
	}
	catch {
		return { ok: false, code: 'API_TOKEN_INVALID' };
	}

	if (!payload?.jti || !payload?.sub || !Array.isArray(payload.scopes) || !payload.exp || !payload.iat) {
		return { ok: false, code: 'API_TOKEN_INVALID' };
	}

	if (payload.exp + CLOCK_SKEW_SEC < nowSec) {
		return { ok: false, code: 'API_TOKEN_EXPIRED' };
	}
	if (payload.iat - CLOCK_SKEW_SEC > nowSec) {
		return { ok: false, code: 'API_TOKEN_INVALID' };
	}

	return { ok: true, payload };
}

function extractBearer(req) {
	const auth = req.headers.authorization || req.headers.Authorization;
	if (!auth || typeof auth !== 'string') return null;
	const m = auth.match(/^Bearer\s+(.+)$/i);
	return m ? m[1].trim() : null;
}

function tokenPrefix(jwt) {
	return String(jwt || '').slice(0, 8);
}

async function ensureTokenIndexes() {
	const col = tokensCollection();
	await col.createIndex({ jti: 1 }, { unique: true });
	await col.createIndex({ revoked_at: 1, expires_at: 1 });
}

function checkCreateRateLimit(sessionId, now = Date.now()) {
	const runs = (createAttemptsBySession.get(sessionId) || []).filter((t) => now - t < HOUR_MS);
	if (runs.length >= MAX_CREATES_PER_HOUR) {
		const err = new Error('Token creation rate limit');
		err.status = 429;
		err.code = 'API_TOKEN_CREATE_RATE';
		err.retry_after_ms = HOUR_MS - (now - Math.min(...runs));
		throw err;
	}
	runs.push(now);
	createAttemptsBySession.set(sessionId, runs);
}

function resetCreateRateLimitForTests() {
	createAttemptsBySession.clear();
}

async function listTokens() {
	const now = new Date();
	const docs = await tokensCollection().find({
		revoked_at: { $exists: false },
		expires_at: { $gt: now },
	}).sort({ created_at: -1 }).toArray();

	return docs.map((doc) => ({
		jti: doc.jti,
		label: doc.label,
		scopes: doc.scopes || [],
		token_prefix: doc.token_prefix,
		created_by: doc.created_by,
		created_at: doc.created_at?.toISOString?.() || doc.created_at,
		expires_at: doc.expires_at?.toISOString?.() || doc.expires_at,
		last_used_at: doc.last_used_at?.toISOString?.() || doc.last_used_at || null,
	}));
}

async function createToken({ label, scopes, expires_in_days, createdBy, env = process.env }) {
	const allowed = enabledScopes(env);
	const requested = (scopes || []).filter((s) => ALLOWED_SCOPES.includes(s));
	const finalScopes = requested.filter((s) => allowed.includes(s));
	if (!finalScopes.length) {
		const err = new Error('No valid scopes');
		err.status = 400;
		err.code = 'API_TOKEN_SCOPES';
		throw err;
	}

	const days = Number(expires_in_days);
	if (!ALLOWED_EXPIRY_DAYS.has(days)) {
		const err = new Error('Invalid expiry');
		err.status = 400;
		err.code = 'API_TOKEN_EXPIRY';
		throw err;
	}

	const cleanLabel = sanitizeLabel(label);
	if (!cleanLabel) {
		const err = new Error('Label required');
		err.status = 400;
		err.code = 'API_TOKEN_LABEL';
		throw err;
	}

	const activeFilter = () => ({
		revoked_at: { $exists: false },
		expires_at: { $gt: new Date() },
	});

	const activeCount = await tokensCollection().countDocuments(activeFilter());
	if (activeCount >= MAX_ACTIVE_TOKENS) {
		const err = new Error('Too many active tokens');
		err.status = 400;
		err.code = 'API_TOKEN_LIMIT';
		throw err;
	}

	const secret = getJwtSecret(env);
	const now = Math.floor(Date.now() / 1000);
	const jti = crypto.randomUUID();
	const exp = now + days * 24 * 60 * 60;
	const payload = {
		jti,
		sub: createdBy,
		scopes: finalScopes,
		label: cleanLabel,
		iat: now,
		exp,
	};
	const jwt = signJwt(payload, secret);
	const nowDate = new Date();

	await tokensCollection().insertOne({
		jti,
		label: cleanLabel,
		scopes: finalScopes,
		created_by: createdBy,
		created_at: nowDate,
		expires_at: new Date(exp * 1000),
		token_prefix: tokenPrefix(jwt),
	});

	// Re-check after insert to close the TOCTOU window under concurrent creates.
	const afterCount = await tokensCollection().countDocuments(activeFilter());
	if (afterCount > MAX_ACTIVE_TOKENS) {
		await tokensCollection().deleteOne({ jti });
		const err = new Error('Too many active tokens');
		err.status = 400;
		err.code = 'API_TOKEN_LIMIT';
		throw err;
	}

	return {
		token: jwt,
		jti,
		label: cleanLabel,
		scopes: finalScopes,
		expires_at: new Date(exp * 1000).toISOString(),
		token_prefix: tokenPrefix(jwt),
	};
}

async function revokeToken(jti) {
	const now = new Date();
	const res = await tokensCollection().updateOne(
		{ jti, revoked_at: { $exists: false } },
		{ $set: { revoked_at: now } },
	);
	if (res.matchedCount === 0) {
		const err = new Error('Token not found');
		err.status = 404;
		err.code = 'API_TOKEN_NOT_FOUND';
		throw err;
	}
	return { ok: true, jti };
}

async function revokeAllTokens() {
	const now = new Date();
	await tokensCollection().updateMany(
		{ revoked_at: { $exists: false } },
		{ $set: { revoked_at: now } },
	);
}

const lastUsedThrottle = new Map();
const LAST_USED_THROTTLE_MS = 60_000;
const LAST_USED_ENTRY_TTL_MS = 10 * 60_000;

async function lookupActiveToken(jti) {
	return tokensCollection().findOne({
		jti,
		revoked_at: { $exists: false },
		expires_at: { $gt: new Date() },
	});
}

function pruneLastUsedThrottle(now = Date.now()) {
	for (const [key, at] of lastUsedThrottle) {
		if (now - at > LAST_USED_ENTRY_TTL_MS) lastUsedThrottle.delete(key);
	}
}

function pruneLastUsedThrottleForTests() {
	pruneLastUsedThrottle();
}

async function touchLastUsed(jti) {
	const now = Date.now();
	pruneLastUsedThrottle(now);
	const last = lastUsedThrottle.get(jti) || 0;
	if (now - last < LAST_USED_THROTTLE_MS) return;
	lastUsedThrottle.set(jti, now);
	await tokensCollection().updateOne(
		{ jti },
		{ $set: { last_used_at: new Date(now) } },
	);
}

function resetLastUsedThrottleForTests() {
	lastUsedThrottle.clear();
}

function seedLastUsedThrottleForTests(entries = {}) {
	for (const [jti, at] of Object.entries(entries)) {
		lastUsedThrottle.set(jti, at);
	}
}

async function validateBearerToken(req, requiredScope, env = process.env) {
	if (!isApiMasterEnabled(env)) {
		const err = new Error('API disabled');
		err.status = 404;
		err.code = 'API_DISABLED';
		throw err;
	}

	const token = extractBearer(req);
	if (!token) {
		const err = new Error('Missing bearer token');
		err.status = 401;
		err.code = 'API_TOKEN_INVALID';
		throw err;
	}

	const secret = getJwtSecret(env);
	const verified = verifyJwt(token, secret);
	if (!verified.ok) {
		const err = new Error('Invalid token');
		err.status = 401;
		err.code = verified.code;
		throw err;
	}

	const doc = await lookupActiveToken(verified.payload.jti);
	if (!doc) {
		const err = new Error('Token revoked or missing');
		err.status = 401;
		err.code = 'API_TOKEN_INVALID';
		throw err;
	}

	const jwtScopes = verified.payload.scopes;
	const docScopes = Array.isArray(doc.scopes) ? doc.scopes : [];
	const allowedNow = enabledScopes(env);
	const scopes = jwtScopes.filter((s) => docScopes.includes(s) && allowedNow.includes(s));

	if (requiredScope && !scopes.includes(requiredScope)) {
		const err = new Error('Scope forbidden');
		err.status = 403;
		err.code = 'API_SCOPE_FORBIDDEN';
		throw err;
	}

	touchLastUsed(verified.payload.jti).catch(() => { void 0; });

	return {
		jti: verified.payload.jti,
		sub: verified.payload.sub,
		scopes,
		label: verified.payload.label,
	};
}

function getApiMeta(env = process.env) {
	return {
		enabled: isApiMasterEnabled(env),
		docs: isDocsEnabled(env),
		scopes: enabledScopes(env),
	};
}

module.exports = {
	JWT_ALG,
	MAX_ACTIVE_TOKENS,
	MAX_CREATES_PER_HOUR,
	isApiMasterEnabled,
	isDocsEnabled,
	enabledScopes,
	getJwtSecret,
	validateJwtSecretAtBoot,
	signJwt,
	verifyJwt,
	extractBearer,
	sanitizeLabel,
	ensureTokenIndexes,
	listTokens,
	createToken,
	revokeToken,
	revokeAllTokens,
	validateBearerToken,
	checkCreateRateLimit,
	resetCreateRateLimitForTests,
	resetLastUsedThrottleForTests,
	seedLastUsedThrottleForTests,
	pruneLastUsedThrottleForTests,
	getApiMeta,
	tokenPrefix,
};
