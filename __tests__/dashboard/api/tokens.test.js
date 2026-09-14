'use strict';

const crypto = require('crypto');

jest.mock('../../../.dashboard/lib/db', () => ({
	connection: {
		db: {
			collection: jest.fn(),
		},
	},
}));

const mongoose = require('../../../.dashboard/lib/db');
const tokens = require('../../../.dashboard/lib/api/tokens');

const SECRET = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789ab';

function mockListFind(docs) {
	const toArray = jest.fn().mockResolvedValue(docs);
	const sort = jest.fn().mockReturnValue({ toArray });
	const find = jest.fn().mockReturnValue({ sort });
	mockCollection({ find });
	return { find, sort, toArray };
}

function mockCollection(overrides = {}) {
	const toArray = jest.fn().mockResolvedValue([]);
	const sort = jest.fn().mockReturnValue({ toArray });
	const find = jest.fn().mockReturnValue({ sort });
	const col = {
		createIndex: jest.fn().mockResolvedValue(undefined),
		find,
		countDocuments: jest.fn().mockResolvedValue(0),
		insertOne: jest.fn().mockResolvedValue({ insertedId: '1' }),
		deleteOne: jest.fn().mockResolvedValue({ deletedCount: 1 }),
		updateOne: jest.fn().mockResolvedValue({ matchedCount: 1 }),
		updateMany: jest.fn().mockResolvedValue({ modifiedCount: 1 }),
		findOne: jest.fn().mockResolvedValue(null),
	};
	Object.assign(col, overrides);
	if (overrides.findOne && typeof overrides.findOne !== 'function') {
		col.findOne = jest.fn().mockResolvedValue(overrides.findOne);
	}
	mongoose.connection.db.collection.mockReturnValue(col);
	return col;
}

describe('apiTokens', () => {
	const prev = { ...process.env };

	beforeEach(() => {
		jest.clearAllMocks();
		tokens.resetCreateRateLimitForTests();
		tokens.resetLastUsedThrottleForTests();
		process.env = { ...prev };
		process.env.DASHBOARD_API = '1';
		process.env.DASHBOARD_API_JWT_SECRET = SECRET;
		process.env.DASHBOARD_API_MATERIALS = '1';
		process.env.DASHBOARD_API_DATA = '1';
		process.env.DASHBOARD_API_GUILDS = '1';
		process.env.DASHBOARD_API_DOCS = '1';
	});

	afterEach(() => {
		process.env = { ...prev };
	});

	describe('JWT helpers', () => {
		it('signs and verifies HS256 token', () => {
			const now = Math.floor(Date.now() / 1000);
			const jwt = tokens.signJwt({
				jti: crypto.randomUUID(),
				sub: 'admin',
				scopes: ['materials'],
				label: 'test',
				iat: now,
				exp: now + 3600,
			}, SECRET);
			const out = tokens.verifyJwt(jwt, SECRET, now);
			expect(out.ok).toBe(true);
			expect(out.payload.sub).toBe('admin');
		});

		it('rejects malformed tokens', () => {
			expect(tokens.verifyJwt('', SECRET).code).toBe('API_TOKEN_INVALID');
			expect(tokens.verifyJwt('a.b', SECRET).code).toBe('API_TOKEN_INVALID');
			expect(tokens.verifyJwt('not-base64!!.x.y', SECRET).code).toBe('API_TOKEN_INVALID');

			const header = Buffer.from('{not-json', 'utf8').toString('base64url');
			expect(tokens.verifyJwt(`${header}.e30.sig`, SECRET).code).toBe('API_TOKEN_INVALID');

			const badAlg = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
			const body = Buffer.from(JSON.stringify({ jti: 'x', sub: 'a', scopes: [], iat: 1, exp: 9e9 })).toString('base64url');
			expect(tokens.verifyJwt(`${badAlg}.${body}.`, SECRET).code).toBe('API_TOKEN_INVALID');

			const goodHeader = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
			const goodBody = Buffer.from(JSON.stringify({
				jti: 'x', sub: 'a', scopes: [], iat: 1, exp: 9e9,
			})).toString('base64url');
			const data = `${goodHeader}.${goodBody}`;
			const sig = require('crypto').createHmac('sha256', SECRET).update(data).digest();
			const b64sig = sig.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
			// Invalid base64 in signature segment triggers decode catch
			expect(tokens.verifyJwt(`${data}.!!!`, SECRET).code).toBe('API_TOKEN_INVALID');
			// Valid sig but non-JSON payload
			const badBody = Buffer.from('{broken', 'utf8').toString('base64url');
			const data2 = `${goodHeader}.${badBody}`;
			const sig2 = require('crypto').createHmac('sha256', SECRET).update(data2).digest();
			const b64sig2 = sig2.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
			expect(tokens.verifyJwt(`${data2}.${b64sig2}`, SECRET).code).toBe('API_TOKEN_INVALID');
			expect(b64sig.length).toBeGreaterThan(0);
		});

		it('rejects bad signature and future iat', () => {
			const now = 1_000_000;
			const jwt = tokens.signJwt({
				jti: 'id',
				sub: 'admin',
				scopes: ['data'],
				label: 'x',
				iat: now + 10_000,
				exp: now + 20_000,
			}, SECRET);
			expect(tokens.verifyJwt(jwt, SECRET, now).code).toBe('API_TOKEN_INVALID');

			const parts = tokens.signJwt({
				jti: 'id',
				sub: 'admin',
				scopes: ['data'],
				label: 'x',
				iat: now,
				exp: now + 100,
			}, SECRET).split('.');
			parts[2] = Buffer.from('bad-sig').toString('base64url');
			expect(tokens.verifyJwt(parts.join('.'), SECRET, now).code).toBe('API_TOKEN_INVALID');

		});

		it('rejects expired and incomplete payload', () => {
			const now = 1_000_000;
			const expired = tokens.signJwt({
				jti: 'id',
				sub: 'admin',
				scopes: ['data'],
				label: 'x',
				iat: now - 200,
				exp: now - 100,
			}, SECRET);
			expect(tokens.verifyJwt(expired, SECRET, now).code).toBe('API_TOKEN_EXPIRED');

			const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
			const body = Buffer.from(JSON.stringify({ jti: 'x' })).toString('base64url');
			const data = `${header}.${body}`;
			const sig = require('crypto').createHmac('sha256', SECRET).update(data).digest();
			const jwt = `${data}.${sig.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')}`;
			expect(tokens.verifyJwt(jwt, SECRET, now).code).toBe('API_TOKEN_INVALID');
		});

		it('sanitizeLabel strips control chars', () => {
			expect(tokens.sanitizeLabel('  ok\x00 ')).toBe('ok');
			expect(tokens.sanitizeLabel('')).toBe('');
		});

		it('extractBearer lit Authorization', () => {
			expect(tokens.extractBearer({ headers: {} })).toBeNull();
			expect(tokens.extractBearer({ headers: { authorization: 'Basic x' } })).toBeNull();
			expect(tokens.extractBearer({ headers: { Authorization: 'Bearer abc' } })).toBe('abc');
		});

		it('tokenPrefix tronque', () => {
			expect(tokens.tokenPrefix('abcdefghijkl')).toBe('abcdefgh');
			expect(tokens.tokenPrefix(null)).toBe('');
		});
	});

	describe('boot / meta', () => {
		it('validateJwtSecretAtBoot fail-closed', () => {
			process.env.DASHBOARD_API = '0';
			expect(() => tokens.validateJwtSecretAtBoot()).not.toThrow();

			process.env.DASHBOARD_API = '1';
			process.env.DASHBOARD_API_JWT_SECRET = 'changeme';
			expect(() => tokens.validateJwtSecretAtBoot()).toThrow(/placeholder/);

			process.env.DASHBOARD_API_JWT_SECRET = 'short';
			expect(() => tokens.validateJwtSecretAtBoot()).toThrow(/32 bytes/);

			process.env.DASHBOARD_API_JWT_SECRET = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
			expect(() => tokens.validateJwtSecretAtBoot()).toThrow(/entropy/);

			process.env.DASHBOARD_API_JWT_SECRET = SECRET;
			expect(() => tokens.validateJwtSecretAtBoot()).not.toThrow();
		});

		it('isDocsEnabled false quand API master off', () => {
			process.env.DASHBOARD_API = '0';
			process.env.DASHBOARD_API_DOCS = '1';
			expect(tokens.isDocsEnabled()).toBe(false);
		});

		it('enabledScopes et docs', () => {
			process.env.DASHBOARD_API = '0';
			expect(tokens.enabledScopes()).toEqual([]);
			expect(tokens.isDocsEnabled()).toBe(false);
			expect(tokens.isApiMasterEnabled()).toBe(false);

			process.env.DASHBOARD_API = '1';
			process.env.DASHBOARD_API_MATERIALS = '1';
			process.env.DASHBOARD_API_DATA = '0';
			process.env.DASHBOARD_API_GUILDS = '1';
			process.env.DASHBOARD_API_DOCS = '1';
			expect(tokens.enabledScopes()).toEqual(['materials', 'guilds']);
			expect(tokens.getApiMeta()).toEqual({
				enabled: true,
				docs: true,
				scopes: ['materials', 'guilds'],
			});
		});

		it('getJwtSecret retourne chaine vide si secret absent', () => {
			const saved = process.env.DASHBOARD_API_JWT_SECRET;
			delete process.env.DASHBOARD_API_JWT_SECRET;
			expect(tokens.getJwtSecret()).toBe('');
			if (saved === undefined) delete process.env.DASHBOARD_API_JWT_SECRET;
			else process.env.DASHBOARD_API_JWT_SECRET = saved;
		});

		it('getApiMeta accepte env explicite', () => {
			expect(tokens.getApiMeta({ DASHBOARD_API: '0' })).toEqual({
				enabled: false,
				docs: false,
				scopes: [],
			});
		});
	});

	describe('persistence', () => {
		it('ensureTokenIndexes crée les index', async () => {
			const col = mockCollection();
			await tokens.ensureTokenIndexes();
			expect(col.createIndex).toHaveBeenCalledTimes(2);
		});

		it('listTokens accepte dates string', async () => {
			mockListFind([{
				jti: 'j1',
				label: 'L',
				scopes: [],
				token_prefix: 'abcd',
				created_by: 'admin',
				created_at: '2024-01-01T00:00:00.000Z',
				expires_at: '2024-02-01T00:00:00.000Z',
				last_used_at: '2024-03-01T00:00:00.000Z',
			}]);
			const list = await tokens.listTokens();
			expect(list[0].created_at).toBe('2024-01-01T00:00:00.000Z');
			expect(list[0].last_used_at).toBe('2024-03-01T00:00:00.000Z');
		});

		it('listTokens mappe documents sans scopes ni toISOString', async () => {
			mockListFind([{
				jti: 'j2',
				label: 'L2',
				token_prefix: 'efgh',
				created_by: 'admin',
				created_at: '2024-01-01T00:00:00.000Z',
				expires_at: '2024-02-01T00:00:00.000Z',
			}]);
			const list = await tokens.listTokens();
			expect(list[0]).toEqual({
				jti: 'j2',
				label: 'L2',
				scopes: [],
				token_prefix: 'efgh',
				created_by: 'admin',
				created_at: '2024-01-01T00:00:00.000Z',
				expires_at: '2024-02-01T00:00:00.000Z',
				last_used_at: null,
			});
		});

		it('listTokens mappe les documents', async () => {
			const created = new Date('2024-01-01T00:00:00.000Z');
			const expires = new Date('2024-02-01T00:00:00.000Z');
			const toArray = jest.fn().mockResolvedValue([{
				jti: 'j1',
				label: 'L',
				scopes: ['materials'],
				token_prefix: 'abcd',
				created_by: 'admin',
				created_at: created,
				expires_at: expires,
				last_used_at: null,
			}]);
			const sort = jest.fn().mockReturnValue({ toArray });
			const find = jest.fn().mockReturnValue({ sort });
			const col = mockCollection({ find });
			const list = await tokens.listTokens();
			expect(list).toEqual([{
				jti: 'j1',
				label: 'L',
				scopes: ['materials'],
				token_prefix: 'abcd',
				created_by: 'admin',
				created_at: created.toISOString(),
				expires_at: expires.toISOString(),
				last_used_at: null,
			}]);
			expect(col.find).toHaveBeenCalled();
		});

		it('createToken valide scopes, expiry, label et limite', async () => {
			const col = mockCollection();
			await expect(tokens.createToken({
				label: 'x',
				scopes: null,
				expires_in_days: 7,
				createdBy: 'admin',
			})).rejects.toMatchObject({ code: 'API_TOKEN_SCOPES', status: 400 });

			await expect(tokens.createToken({
				label: 'x',
				scopes: ['nope'],
				expires_in_days: 7,
				createdBy: 'admin',
			})).rejects.toMatchObject({ code: 'API_TOKEN_SCOPES', status: 400 });

			await expect(tokens.createToken({
				label: 'x',
				scopes: ['materials'],
				expires_in_days: 3,
				createdBy: 'admin',
			})).rejects.toMatchObject({ code: 'API_TOKEN_EXPIRY' });

			await expect(tokens.createToken({
				label: '   ',
				scopes: ['materials'],
				expires_in_days: 7,
				createdBy: 'admin',
			})).rejects.toMatchObject({ code: 'API_TOKEN_LABEL' });

			col.countDocuments.mockResolvedValue(tokens.MAX_ACTIVE_TOKENS);
			await expect(tokens.createToken({
				label: 'ok',
				scopes: ['materials'],
				expires_in_days: 7,
				createdBy: 'admin',
			})).rejects.toMatchObject({ code: 'API_TOKEN_LIMIT' });
		});

		it('createToken rollback si course sur la limite active', async () => {
			const col = mockCollection({
				countDocuments: jest.fn()
					.mockResolvedValueOnce(tokens.MAX_ACTIVE_TOKENS - 1)
					.mockResolvedValueOnce(tokens.MAX_ACTIVE_TOKENS + 1),
			});
			await expect(tokens.createToken({
				label: 'race',
				scopes: ['materials'],
				expires_in_days: 7,
				createdBy: 'admin',
			})).rejects.toMatchObject({ code: 'API_TOKEN_LIMIT', status: 400 });
			expect(col.insertOne).toHaveBeenCalled();
			expect(col.deleteOne).toHaveBeenCalledWith(expect.objectContaining({ jti: expect.any(String) }));
		});

		it('createToken insert et retourne le jwt', async () => {
			const col = mockCollection();
			const out = await tokens.createToken({
				label: 'prod',
				scopes: ['materials', 'guilds', 'unknown'],
				expires_in_days: 30,
				createdBy: 'admin',
			});
			expect(out.token.split('.')).toHaveLength(3);
			expect(out.scopes).toEqual(['materials', 'guilds']);
			expect(col.insertOne).toHaveBeenCalled();
		});

		it('revokeToken et revokeAllTokens', async () => {
			const col = mockCollection({
				updateOne: jest.fn().mockResolvedValue({ matchedCount: 0 }),
			});
			await expect(tokens.revokeToken('missing')).rejects.toMatchObject({ code: 'API_TOKEN_NOT_FOUND', status: 404 });

			col.updateOne.mockResolvedValue({ matchedCount: 1 });
			await expect(tokens.revokeToken('j1')).resolves.toEqual({ ok: true, jti: 'j1' });
			await tokens.revokeAllTokens();
			expect(col.updateMany).toHaveBeenCalled();
		});

		it('checkCreateRateLimit limite les créations', () => {
			for (let i = 0; i < tokens.MAX_CREATES_PER_HOUR; i++) {
				tokens.checkCreateRateLimit('sess');
			}
			expect(() => tokens.checkCreateRateLimit('sess')).toThrow(/rate limit/);
			try {
				tokens.checkCreateRateLimit('sess');
			}
			catch (err) {
				expect(err.status).toBe(429);
				expect(err.code).toBe('API_TOKEN_CREATE_RATE');
				expect(err.retry_after_ms).toBeGreaterThan(0);
			}
		});
	});

	describe('validateBearerToken', () => {
		it('refuse API off, bearer manquant, jwt invalide, token absent, scope', async () => {
			process.env.DASHBOARD_API = '0';
			await expect(tokens.validateBearerToken({ headers: {} }, 'materials'))
				.rejects.toMatchObject({ code: 'API_DISABLED', status: 404 });

			process.env.DASHBOARD_API = '1';
			await expect(tokens.validateBearerToken({ headers: {} }, 'materials'))
				.rejects.toMatchObject({ code: 'API_TOKEN_INVALID', status: 401 });

			await expect(tokens.validateBearerToken({ headers: { authorization: 'Bearer not.a.jwt' } }, 'materials'))
				.rejects.toMatchObject({ status: 401 });

			const now = Math.floor(Date.now() / 1000);
			const jwt = tokens.signJwt({
				jti: 'gone',
				sub: 'admin',
				scopes: ['materials'],
				label: 't',
				iat: now,
				exp: now + 1000,
			}, SECRET);
			mockCollection({ findOne: jest.fn().mockResolvedValue(null) });
			await expect(tokens.validateBearerToken({ headers: { authorization: `Bearer ${jwt}` } }, 'materials'))
				.rejects.toMatchObject({ code: 'API_TOKEN_INVALID' });

			mockCollection({ findOne: jest.fn().mockResolvedValue({ jti: 'gone', scopes: ['guilds'] }) });
			const jwtGuilds = tokens.signJwt({
				jti: 'gone',
				sub: 'admin',
				scopes: ['guilds'],
				label: 't',
				iat: now,
				exp: now + 1000,
			}, SECRET);
			await expect(tokens.validateBearerToken({ headers: { authorization: `Bearer ${jwtGuilds}` } }, 'materials'))
				.rejects.toMatchObject({ code: 'API_SCOPE_FORBIDDEN', status: 403 });
		});

		it('intersecte scopes JWT, document et flags env', async () => {
			const now = Math.floor(Date.now() / 1000);
			const jwt = tokens.signJwt({
				jti: 'scoped',
				sub: 'admin',
				scopes: ['materials', 'data', 'guilds'],
				label: 't',
				iat: now,
				exp: now + 1000,
			}, SECRET);
			mockCollection({
				findOne: jest.fn().mockResolvedValue({ jti: 'scoped', scopes: ['materials', 'data'] }),
			});
			const out = await tokens.validateBearerToken({ headers: { authorization: `Bearer ${jwt}` } }, 'materials');
			expect(out.scopes).toEqual(['materials', 'data']);

			process.env.DASHBOARD_API_DATA = '0';
			const narrowed = await tokens.validateBearerToken({ headers: { authorization: `Bearer ${jwt}` } }, 'materials');
			expect(narrowed.scopes).toEqual(['materials']);

			await expect(tokens.validateBearerToken({ headers: { authorization: `Bearer ${jwt}` } }, 'data'))
				.rejects.toMatchObject({ code: 'API_SCOPE_FORBIDDEN' });

			mockCollection({
				findOne: jest.fn().mockResolvedValue({ jti: 'scoped', scopes: ['guilds'] }),
			});
			await expect(tokens.validateBearerToken({ headers: { authorization: `Bearer ${jwt}` } }, 'materials'))
				.rejects.toMatchObject({ code: 'API_SCOPE_FORBIDDEN' });

			mockCollection({
				findOne: jest.fn().mockResolvedValue({ jti: 'scoped', scopes: null }),
			});
			await expect(tokens.validateBearerToken({ headers: { authorization: `Bearer ${jwt}` } }, 'materials'))
				.rejects.toMatchObject({ code: 'API_SCOPE_FORBIDDEN' });
		});

		it('accepte un token valide et throttle last_used', async () => {
			const now = Math.floor(Date.now() / 1000);
			const jwt = tokens.signJwt({
				jti: 'ok',
				sub: 'admin',
				scopes: ['materials'],
				label: 't',
				iat: now,
				exp: now + 1000,
			}, SECRET);
			const col = mockCollection({
				findOne: jest.fn().mockResolvedValue({ jti: 'ok', scopes: ['materials'] }),
				updateOne: jest.fn().mockResolvedValue({ matchedCount: 1 }),
			});

			const out = await tokens.validateBearerToken({ headers: { authorization: `Bearer ${jwt}` } }, 'materials');
			expect(out).toEqual({
				jti: 'ok',
				sub: 'admin',
				scopes: ['materials'],
				label: 't',
			});
			await tokens.validateBearerToken({ headers: { authorization: `Bearer ${jwt}` } }, null);
			await new Promise((resolve) => {
				setTimeout(resolve, 0);
			});
			expect(col.updateOne).toHaveBeenCalled();

			tokens.resetLastUsedThrottleForTests();
			col.updateOne.mockRejectedValue(new Error('touch fail'));
			await tokens.validateBearerToken({ headers: { authorization: `Bearer ${jwt}` } }, 'materials');
			await new Promise((resolve) => {
				setTimeout(resolve, 20);
			});
			col.updateOne.mockResolvedValue({ matchedCount: 1 });
		});

		it('prune les entrées lastUsedThrottle trop anciennes', async () => {
			const now = Math.floor(Date.now() / 1000);
			const jwt = tokens.signJwt({
				jti: 'jti-old',
				sub: 'admin',
				scopes: ['materials'],
				label: 't',
				iat: now,
				exp: now + 1000,
			}, SECRET);
			const col = mockCollection({
				findOne: jest.fn().mockResolvedValue({ jti: 'jti-old', scopes: ['materials'] }),
				updateOne: jest.fn().mockResolvedValue({ matchedCount: 1 }),
			});
			tokens.seedLastUsedThrottleForTests();
			tokens.seedLastUsedThrottleForTests({
				'jti-stale': Date.now() - 11 * 60_000,
				'jti-keep': Date.now(),
				'jti-old': Date.now() - 11 * 60_000,
			});
			tokens.pruneLastUsedThrottleForTests();
			await tokens.validateBearerToken({ headers: { authorization: `Bearer ${jwt}` } }, 'materials');
			await new Promise((resolve) => {
				setTimeout(resolve, 0);
			});
			expect(col.updateOne).toHaveBeenCalled();
		});
	});
});
