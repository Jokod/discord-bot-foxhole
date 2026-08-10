'use strict';

const path = require('path');
const {
	safeHttpUrl,
	publicLinks,
	createAuthPayload,
	createRequestHandler,
} = require('../../.dashboard/lib/createHandler');

function mockRes() {
	return {
		statusCode: null,
		headers: null,
		body: null,
		ended: false,
		writeHead(status, headers) {
			this.statusCode = status;
			this.headers = headers;
		},
		end(chunk) {
			this.body = chunk;
			this.ended = true;
		},
	};
}

function jsonBody(res) {
	return JSON.parse(res.body);
}

describe('dashboard createHandler', () => {
	describe('safeHttpUrl / publicLinks', () => {
		it('accepts http(s) and strips trailing slash', () => {
			expect(safeHttpUrl('https://discord.gg/foo/')).toBe('https://discord.gg/foo');
			expect(safeHttpUrl('http://example.com')).toBe('http://example.com');
		});

		it('rejects empty, invalid, and non-http schemes', () => {
			expect(safeHttpUrl('')).toBeNull();
			expect(safeHttpUrl('not a url')).toBeNull();
			expect(safeHttpUrl('javascript:alert(1)')).toBeNull();
			expect(safeHttpUrl('ftp://x')).toBeNull();
		});

		it('publicLinks reads env', () => {
			expect(publicLinks({
				DISCORD_INVITE_URL: 'https://discord.gg/x/',
				GITHUB_URL: 'https://github.com/a/b',
			})).toEqual({
				discord: 'https://discord.gg/x',
				github: 'https://github.com/a/b',
			});
			expect(publicLinks({})).toEqual({ discord: null, github: null });
		});
	});

	describe('createAuthPayload', () => {
		it('builds authenticated payload with session extras', async () => {
			const auth = {
				getCredentials: jest.fn().mockResolvedValue({
					updatedAt: new Date('2026-01-02T00:00:00.000Z'),
					lastLoginAt: new Date('2026-01-03T00:00:00.000Z'),
				}),
				describeSession: jest.fn(() => ({
					started_at: '2026-01-01T00:00:00.000Z',
					ip: '127.0.0.1',
					expires_at: '2026-01-02T00:00:00.000Z',
					active_sessions: 1,
				})),
			};
			const authPayload = createAuthPayload({
				auth,
				envPath: '/tmp/.env.prod',
				env: { MONGODB_NAME: 'fox', GITHUB_URL: 'https://github.com/x/y' },
			});
			const out = await authPayload({ username: 'admin', isDefault: false });
			expect(out).toMatchObject({
				authenticated: true,
				username: 'admin',
				isDefault: false,
				links: { github: 'https://github.com/x/y', discord: null },
			});
			expect(out.session.env_file).toBe('.env.prod');
			expect(out.session.db_name).toBe('fox');
			expect(out.session.credentials_updated_at).toBe('2026-01-02T00:00:00.000Z');
			expect(out.session.last_login_at).toBe('2026-01-03T00:00:00.000Z');
		});
	});

	describe('createRequestHandler routes', () => {
		let auth;
		let sendJson;
		let readJsonBody;
		let sendUnauthorized;
		let sendHtml;
		let sendAsset;
		let loadSummary;
		let loadContacts;
		let loadMaterials;
		let guildActions;
		let authPayload;
		let handler;
		let fsApi;
		const i18nDir = path.join(__dirname, '../../.dashboard/i18n');

		beforeEach(() => {
			auth = {
				requireSession: jest.fn(),
				assertSameOrigin: jest.fn(),
				validateLogin: jest.fn(),
				destroySession: jest.fn(),
				sessionIdFromReq: jest.fn(() => null),
				createSession: jest.fn(() => 'sid'),
				setSessionCookie: jest.fn(),
				clearSessionCookie: jest.fn(),
				getSession: jest.fn(() => ({ username: 'admin', isDefault: false })),
				updateCredentials: jest.fn(),
			};
			sendJson = jest.fn((res, status, body) => {
				res.writeHead(status, {});
				res.end(JSON.stringify(body));
			});
			readJsonBody = jest.fn().mockResolvedValue({});
			sendUnauthorized = jest.fn((res) => sendJson(res, 401, { error: 'Not authenticated' }));
			sendHtml = jest.fn((res) => {
				res.writeHead(200, {});
				res.end('html');
			});
			sendAsset = jest.fn((res) => {
				res.writeHead(200, {});
				res.end('asset');
			});
			loadSummary = jest.fn().mockResolvedValue({ kpis: { active_guilds: 1 } });
			loadContacts = jest.fn().mockResolvedValue({ people: [] });
			loadMaterials = jest.fn().mockResolvedValue({ categories: [], items: [] });
			guildActions = {
				handleLeave: jest.fn().mockResolvedValue({ results: [] }),
				handleBlacklist: jest.fn().mockResolvedValue({ results: [] }),
				handleUnblacklist: jest.fn().mockResolvedValue({ results: [] }),
				handleBroadcast: jest.fn().mockResolvedValue({ results: [] }),
			};
			authPayload = jest.fn(async (session) => ({
				authenticated: true,
				username: session.username,
				isDefault: session.isDefault,
				session: { ip: '1.1.1.1' },
				links: {},
			}));
			fsApi = {
				existsSync: require('fs').existsSync,
				readFileSync: require('fs').readFileSync,
			};
			handler = createRequestHandler({
				auth,
				sendJson,
				readJsonBody,
				sendUnauthorized,
				sendHtml,
				sendAsset,
				loadSummary,
				loadContacts,
				loadMaterials,
				guildActions,
				authPayload,
				publicLinks: () => ({ discord: null, github: null }),
				faviconPath: '/tmp/favicon.ico',
				i18nDir,
				i18nFiles: new Set(['en.json', 'fr.json']),
				fsApi,
			});
		});

		it('GET /api/health', async () => {
			const res = mockRes();
			await handler({ method: 'GET', url: '/api/health' }, res);
			expect(jsonBody(res)).toEqual({ ok: true });
		});

		it('GET /api/me anonymous and authenticated', async () => {
			auth.requireSession.mockReturnValue(null);
			const anon = mockRes();
			await handler({ method: 'GET', url: '/api/me' }, anon);
			expect(jsonBody(anon)).toMatchObject({ authenticated: false });

			auth.requireSession.mockReturnValue({ username: 'admin', isDefault: false });
			const authed = mockRes();
			await handler({ method: 'GET', url: '/api/me' }, authed);
			expect(jsonBody(authed)).toMatchObject({ authenticated: true, username: 'admin' });
		});

		it('POST /api/login success and failure', async () => {
			readJsonBody.mockResolvedValue({ username: 'admin', password: 'x' });
			auth.validateLogin.mockResolvedValue(null);
			const bad = mockRes();
			await handler({ method: 'POST', url: '/api/login' }, bad);
			expect(jsonBody(bad)).toMatchObject({ code: 'AUTH_INVALID' });

			auth.validateLogin.mockResolvedValue({ username: 'admin', isDefault: false });
			const ok = mockRes();
			await handler({ method: 'POST', url: '/api/login' }, ok);
			expect(auth.createSession).toHaveBeenCalled();
			expect(auth.setSessionCookie).toHaveBeenCalled();
			expect(jsonBody(ok).authenticated).toBe(true);
		});

		it('POST /api/logout clears cookie', async () => {
			const res = mockRes();
			await handler({ method: 'POST', url: '/api/logout' }, res);
			expect(auth.clearSessionCookie).toHaveBeenCalled();
			expect(jsonBody(res)).toEqual({ ok: true });
		});

		it('serves html, assets, favicon 404', async () => {
			const html = mockRes();
			await handler({ method: 'GET', url: '/' }, html);
			expect(sendHtml).toHaveBeenCalled();

			const asset = mockRes();
			await handler({ method: 'GET', url: '/assets/app.js' }, asset);
			expect(sendAsset).toHaveBeenCalled();

			fsApi = {
				existsSync: jest.fn(() => false),
				readFileSync: jest.fn(),
			};
			handler = createRequestHandler({
				auth,
				sendJson,
				readJsonBody,
				sendUnauthorized,
				sendHtml,
				sendAsset,
				loadSummary,
				loadContacts,
				loadMaterials,
				guildActions,
				authPayload,
				publicLinks: () => ({ discord: null, github: null }),
				faviconPath: '/tmp/favicon.ico',
				i18nDir,
				i18nFiles: new Set(['en.json', 'fr.json']),
				fsApi,
			});
			const fav = mockRes();
			await handler({ method: 'GET', url: '/favicon.ico' }, fav);
			expect(fav.statusCode).toBe(404);
		});

		it('serves i18n json and rejects unknown locale', async () => {
			const ok = mockRes();
			await handler({ method: 'GET', url: '/i18n/en.json' }, ok);
			expect(ok.statusCode).toBe(200);
			expect(JSON.parse(ok.body).title).toBeTruthy();

			const bad = mockRes();
			await handler({ method: 'GET', url: '/i18n/../en.json' }, bad);
			expect(bad.statusCode).toBe(404);

			const missing = mockRes();
			await handler({ method: 'GET', url: '/i18n/de.json' }, missing);
			expect(missing.statusCode).toBe(404);
		});

		it('requires session for protected routes', async () => {
			auth.requireSession.mockReturnValue(null);
			const res = mockRes();
			await handler({ method: 'GET', url: '/api/summary' }, res);
			expect(sendUnauthorized).toHaveBeenCalled();
		});

		it('blocks default session from summary/actions', async () => {
			auth.requireSession.mockReturnValue({ username: 'admin', isDefault: true });
			const res = mockRes();
			await handler({ method: 'GET', url: '/api/summary' }, res);
			expect(jsonBody(res)).toMatchObject({ code: 'AUTH_DEFAULT_BLOCK' });
		});

		it('GET /api/summary attaches session', async () => {
			auth.requireSession.mockReturnValue({ username: 'admin', isDefault: false });
			const res = mockRes();
			await handler({ method: 'GET', url: '/api/summary' }, res);
			expect(loadSummary).toHaveBeenCalled();
			expect(jsonBody(res).session).toEqual({ ip: '1.1.1.1' });
		});

		it('GET /api/contacts honors force=1', async () => {
			auth.requireSession.mockReturnValue({ username: 'admin', isDefault: false });
			await handler({ method: 'GET', url: '/api/contacts?force=1' }, mockRes());
			expect(loadContacts).toHaveBeenCalledWith({ force: true });
			await handler({ method: 'GET', url: '/api/contacts' }, mockRes());
			expect(loadContacts).toHaveBeenCalledWith({ force: false });
		});

		it('GET /api/materials returns catalog', async () => {
			auth.requireSession.mockReturnValue({ username: 'admin', isDefault: false });
			loadMaterials.mockResolvedValue({
				categories: [{ id: 'resources', icon: '📦', subcategories: ['bmat'] }],
				items: [{ itemName: 'Basic Materials' }],
			});
			const res = mockRes();
			await handler({ method: 'GET', url: '/api/materials' }, res);
			expect(loadMaterials).toHaveBeenCalled();
			expect(jsonBody(res).items[0].itemName).toBe('Basic Materials');
		});

		it('POST guild action routes', async () => {
			auth.requireSession.mockReturnValue({ username: 'ops', isDefault: false });
			readJsonBody.mockResolvedValue({ guild_ids: ['g1'], message: 'hi', dry_run: true });

			await handler({ method: 'POST', url: '/api/guilds/leave' }, mockRes());
			expect(guildActions.handleLeave).toHaveBeenCalledWith({ guild_ids: ['g1'], message: 'hi', dry_run: true });

			await handler({ method: 'POST', url: '/api/guilds/blacklist' }, mockRes());
			expect(guildActions.handleBlacklist).toHaveBeenCalledWith(
				expect.any(Object),
				'ops',
			);

			await handler({ method: 'POST', url: '/api/guilds/unblacklist' }, mockRes());
			expect(guildActions.handleUnblacklist).toHaveBeenCalled();

			await handler({ method: 'POST', url: '/api/guilds/broadcast' }, mockRes());
			expect(guildActions.handleBroadcast).toHaveBeenCalled();
			expect(readJsonBody).toHaveBeenCalledWith(expect.anything(), 64 * 1024);
		});

		it('POST /api/profile refreshes session', async () => {
			auth.requireSession.mockReturnValue({ username: 'admin', isDefault: true });
			readJsonBody.mockResolvedValue({
				currentPassword: 'old',
				username: 'admin',
				newPassword: 'new-password-12',
			});
			auth.updateCredentials.mockResolvedValue({ username: 'admin', isDefault: false });
			const res = mockRes();
			await handler({ method: 'POST', url: '/api/profile' }, res);
			expect(auth.updateCredentials).toHaveBeenCalled();
			expect(auth.setSessionCookie).toHaveBeenCalled();
			expect(jsonBody(res).authenticated).toBe(true);
		});

		it('returns 404 for unknown routes when authenticated', async () => {
			auth.requireSession.mockReturnValue({ username: 'admin', isDefault: false });
			const res = mockRes();
			await handler({ method: 'GET', url: '/api/unknown' }, res);
			expect(res.statusCode).toBe(404);
		});
	});
});
