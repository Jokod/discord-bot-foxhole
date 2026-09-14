'use strict';

const fs = require('fs');
const path = require('path');
const mongoose = require('./db');
const {
	isApiMasterEnabled,
	getApiMeta,
	listTokens,
	createToken,
	revokeToken,
	checkCreateRateLimit,
} = require('./api/tokens');
const { publicJsonHeaders, handlePublicMaterialCategories, handlePublicMaterialItems, handlePublicGuilds } = require('./api/public');
const { filterOpenApiSpec, isOpenApiRouteEnabled } = require('./api/openapi');
const { isWikiSyncApiEnabled, isWikiWriteEnabled } = require('./wiki/sync');
const { SWAGGER_CSP } = require('./csp');
const { serveAvatar, isDiscordUserId } = require('./discordAvatar');

function safeHttpUrl(value) {
	const raw = String(value || '').trim();
	if (!raw) return null;
	try {
		const u = new URL(raw);
		if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
		return u.toString().replace(/\/$/, '');
	}
	catch {
		return null;
	}
}

function publicLinks(env = process.env) {
	return {
		discord: safeHttpUrl(env.DISCORD_INVITE_URL),
		github: safeHttpUrl(env.GITHUB_URL),
	};
}

function createAuthPayload({ auth, envPath, env = process.env, wikiSyncStore }) {
	return async function authPayload(session, extras = {}) {
		const creds = await auth.getCredentials();
		const api = getApiMeta(env);
		const wikiSync = wikiSyncStore?.getConfig?.() || {
			enabled: isWikiSyncApiEnabled(env),
			write_enabled: isWikiWriteEnabled(env),
		};
		return {
			authenticated: true,
			username: session.username,
			isDefault: session.isDefault,
			links: publicLinks(env),
			api,
			wiki_sync: wikiSync,
			session: {
				...auth.describeSession(session),
				env_file: path.basename(envPath),
				db_name: mongoose.connection.name || env.MONGODB_NAME || null,
				credentials_updated_at: creds?.updatedAt
					? new Date(creds.updatedAt).toISOString()
					: null,
				last_login_at: creds?.lastLoginAt
					? new Date(creds.lastLoginAt).toISOString()
					: null,
			},
			...extras,
		};
	};
}

function parseQuery(rawUrl) {
	const q = rawUrl.includes('?') ? rawUrl.slice(rawUrl.indexOf('?') + 1) : '';
	const out = {};
	for (const part of q.split('&')) {
		if (!part) continue;
		const [k, v] = part.split('=');
		if (k) out[decodeURIComponent(k)] = decodeURIComponent(v || '');
	}
	return out;
}

function sendPublicJson(sendJson, res, status, body) {
	return sendJson(res, status, body, publicJsonHeaders());
}

function isSpaDocumentRequest(method, urlPath) {
	if (method !== 'GET') return false;
	if (urlPath.startsWith('/api/')) return false;
	if (urlPath.startsWith('/assets/')) return false;
	if (urlPath.startsWith('/i18n/')) return false;
	if (urlPath === '/favicon.ico') return false;
	return true;
}

function createRequestHandler(deps) {
	const {
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
		publicLinks: linksFn = publicLinks,
		faviconPath,
		i18nDir,
		i18nFiles,
		fsApi = fs,
		wikiSyncStore,
		handlePublicData,
		swaggerHtmlPath,
		env = process.env,
	} = deps;

	return async function requestHandler(req, res) {
		const method = req.method || 'GET';
		const rawUrl = req.url || '/';
		const urlPath = rawUrl.split('?')[0];

		if (urlPath === '/api/health' && method === 'GET') {
			return sendJson(res, 200, { ok: true });
		}

		if (urlPath === '/api/me' && method === 'GET') {
			const links = linksFn();
			const session = auth.requireSession(req);
			if (!session) return sendJson(res, 200, { authenticated: false, links });
			return sendJson(res, 200, await authPayload(session));
		}

		if ((urlPath === '/favicon.ico') && method === 'GET') {
			if (!fsApi.existsSync(faviconPath)) {
				res.writeHead(404, { 'Content-Type': 'text/plain', 'X-Content-Type-Options': 'nosniff' });
				res.end('Not found');
				return;
			}
			res.writeHead(200, {
				'Content-Type': 'image/x-icon',
				'Cache-Control': 'public, max-age=86400',
				'X-Content-Type-Options': 'nosniff',
			});
			res.end(fsApi.readFileSync(faviconPath));
			return;
		}

		if (urlPath === '/api/login' && method === 'POST') {
			auth.assertSameOrigin(req);
			const body = await readJsonBody(req);
			const user = await auth.validateLogin(body.username, body.password, req);
			if (!user) return sendJson(res, 401, { error: 'Invalid credentials', code: 'AUTH_INVALID' });
			auth.destroySession(auth.sessionIdFromReq(req));
			const sid = auth.createSession(user, req);
			auth.setSessionCookie(res, sid);
			const session = auth.getSession(sid);
			return sendJson(res, 200, await authPayload(session));
		}

		if (urlPath === '/api/logout' && method === 'POST') {
			auth.assertSameOrigin(req);
			auth.destroySession(auth.sessionIdFromReq(req));
			auth.clearSessionCookie(res);
			return sendJson(res, 200, { ok: true });
		}

		if (isSpaDocumentRequest(method, urlPath)) {
			return sendHtml(res);
		}
		if (urlPath.startsWith('/assets/') && method === 'GET') {
			return sendAsset(res, urlPath);
		}
		if (urlPath.startsWith('/i18n/') && method === 'GET') {
			const name = urlPath.slice('/i18n/'.length);
			if (!i18nFiles.has(name) || name.includes('..')) {
				res.writeHead(404, { 'Content-Type': 'text/plain', 'X-Content-Type-Options': 'nosniff' });
				res.end('Not found');
				return;
			}
			const filePath = path.join(i18nDir, name);
			if (!filePath.startsWith(i18nDir) || !fsApi.existsSync(filePath)) {
				res.writeHead(404, { 'Content-Type': 'text/plain', 'X-Content-Type-Options': 'nosniff' });
				res.end('Not found');
				return;
			}
			res.writeHead(200, {
				'Content-Type': 'application/json; charset=utf-8',
				'Cache-Control': 'no-store',
				'X-Content-Type-Options': 'nosniff',
			});
			res.end(fsApi.readFileSync(filePath));
			return;
		}

		if (urlPath === '/api/public/materials/categories' && method === 'GET') {
			return sendPublicJson(sendJson, res, 200, await handlePublicMaterialCategories(req, env));
		}
		if (urlPath === '/api/public/materials/items' && method === 'GET') {
			return sendPublicJson(sendJson, res, 200, await handlePublicMaterialItems(req, env));
		}
		if (urlPath === '/api/public/data' && method === 'GET') {
			if (!handlePublicData) {
				res.writeHead(404, { 'Content-Type': 'text/plain', 'X-Content-Type-Options': 'nosniff' });
				res.end('Not found');
				return;
			}
			return sendPublicJson(sendJson, res, 200, await handlePublicData(req, env));
		}
		if (urlPath === '/api/public/guilds' && method === 'GET') {
			return sendPublicJson(sendJson, res, 200, await handlePublicGuilds(req, env));
		}

		if (urlPath === '/api/openapi.json' && method === 'GET') {
			if (!isOpenApiRouteEnabled(env)) {
				res.writeHead(404, { 'Content-Type': 'text/plain', 'X-Content-Type-Options': 'nosniff' });
				res.end('Not found');
				return;
			}
			const spec = filterOpenApiSpec(env);
			return sendPublicJson(sendJson, res, 200, spec);
		}

		if (urlPath === '/api/docs' && method === 'GET') {
			if (!isOpenApiRouteEnabled(env)) {
				res.writeHead(404, { 'Content-Type': 'text/plain', 'X-Content-Type-Options': 'nosniff' });
				res.end('Not found');
				return;
			}
			if (!swaggerHtmlPath || !fsApi.existsSync(swaggerHtmlPath)) {
				res.writeHead(404, { 'Content-Type': 'text/plain', 'X-Content-Type-Options': 'nosniff' });
				res.end('Not found');
				return;
			}
			res.writeHead(200, {
				'Content-Type': 'text/html; charset=utf-8',
				'Cache-Control': 'no-store',
				'X-Content-Type-Options': 'nosniff',
				'X-Frame-Options': 'DENY',
				'Content-Security-Policy': SWAGGER_CSP,
			});
			res.end(fsApi.readFileSync(swaggerHtmlPath, 'utf8'));
			return;
		}

		const session = auth.requireSession(req);
		if (!session) return sendUnauthorized(res);

		if (urlPath === '/api/profile' && method === 'POST') {
			auth.assertSameOrigin(req);
			const body = await readJsonBody(req);
			const updated = await auth.updateCredentials({
				currentPassword: body.currentPassword,
				username: body.username,
				newPassword: body.newPassword,
			});
			const sid = auth.createSession(updated, req);
			auth.setSessionCookie(res, sid);
			const refreshed = auth.getSession(sid);
			return sendJson(res, 200, await authPayload(refreshed));
		}

		if (session.isDefault) {
			return sendJson(res, 403, {
				error: 'Change default password in Settings first',
				code: 'AUTH_DEFAULT_BLOCK',
			});
		}

		if (urlPath === '/api/summary' && method === 'GET') {
			const summary = await loadSummary();
			const payload = await authPayload(session);
			summary.session = payload.session;
			return sendJson(res, 200, summary);
		}
		if (urlPath === '/api/contacts' && method === 'GET') {
			const force = rawUrl.includes('force=1');
			return sendJson(res, 200, await loadContacts({ force }));
		}
		if (urlPath.startsWith('/api/avatar/') && method === 'GET') {
			const userId = urlPath.slice('/api/avatar/'.length);
			if (!userId || userId.includes('/') || !isDiscordUserId(userId)) {
				res.writeHead(400, { 'Content-Type': 'text/plain', 'X-Content-Type-Options': 'nosniff' });
				res.end('Bad request');
				return;
			}
			return serveAvatar(userId, res);
		}
		if (urlPath === '/api/materials' && method === 'GET') {
			return sendJson(res, 200, await loadMaterials());
		}

		if (isApiMasterEnabled(env) && urlPath === '/api/profile/tokens' && method === 'GET') {
			return sendJson(res, 200, { tokens: await listTokens() });
		}
		if (isApiMasterEnabled(env) && urlPath === '/api/profile/tokens' && method === 'POST') {
			auth.assertSameOrigin(req);
			const body = await readJsonBody(req);
			if (!body.currentPassword) {
				return sendJson(res, 400, { error: 'Current password required', code: 'AUTH_FORBIDDEN_PASSWORD' });
			}
			const creds = await auth.getCredentials();
			if (!auth.verifyPassword(body.currentPassword, creds.salt, creds.hash)) {
				return sendJson(res, 403, { error: 'Current password incorrect', code: 'AUTH_FORBIDDEN_PASSWORD' });
			}
			const sessionId = auth.sessionIdFromReq(req);
			checkCreateRateLimit(sessionId);
			const created = await createToken({
				label: body.label,
				scopes: body.scopes,
				expires_in_days: body.expires_in_days,
				createdBy: session.username,
				env,
			});
			return sendJson(res, 201, created);
		}
		if (isApiMasterEnabled(env) && urlPath.startsWith('/api/profile/tokens/') && method === 'DELETE') {
			auth.assertSameOrigin(req);
			const jti = urlPath.slice('/api/profile/tokens/'.length);
			if (!jti || jti.includes('/')) {
				return sendJson(res, 400, { error: 'Invalid token id', code: 'API_TOKEN_NOT_FOUND' });
			}
			await revokeToken(jti);
			return sendJson(res, 200, { ok: true, jti });
		}

		if (wikiSyncStore && urlPath === '/api/wiki-sync' && method === 'POST') {
			auth.assertSameOrigin(req);
			const body = await readJsonBody(req);
			try {
				const out = await wikiSyncStore.startJob(req, auth, body);
				return sendJson(res, 202, out);
			}
			catch (err) {
				return sendJson(res, err.status || 500, {
					error: err.message,
					code: err.code,
					retry_after_ms: err.retry_after_ms,
				});
			}
		}
		if (wikiSyncStore && urlPath === '/api/wiki-sync/status' && method === 'GET') {
			const query = parseQuery(rawUrl);
			try {
				return sendJson(res, 200, wikiSyncStore.getStatus(req, auth, query));
			}
			catch (err) {
				return sendJson(res, err.status || 500, {
					error: err.message,
					code: err.code,
					retry_after_ms: err.retry_after_ms,
				});
			}
		}
		if (wikiSyncStore && urlPath === '/api/wiki-sync/abort' && method === 'POST') {
			auth.assertSameOrigin(req);
			const body = await readJsonBody(req);
			try {
				return sendJson(res, 200, wikiSyncStore.abortJob(req, auth, body));
			}
			catch (err) {
				return sendJson(res, err.status || 500, {
					error: err.message,
					code: err.code,
				});
			}
		}

		const guildActionRoutes = {
			'/api/guilds/leave': (body) => guildActions.handleLeave(body),
			'/api/guilds/blacklist': (body) => guildActions.handleBlacklist(body, session.username),
			'/api/guilds/unblacklist': (body) => guildActions.handleUnblacklist(body),
			'/api/guilds/broadcast': (body) => guildActions.handleBroadcast(body),
		};
		if (guildActionRoutes[urlPath] && method === 'POST') {
			auth.assertSameOrigin(req);
			const body = await readJsonBody(req, 64 * 1024);
			return sendJson(res, 200, await guildActionRoutes[urlPath](body));
		}

		res.writeHead(404, { 'Content-Type': 'text/plain', 'X-Content-Type-Options': 'nosniff' });
		res.end('Not found');
	};
}

module.exports = {
	safeHttpUrl,
	publicLinks,
	createAuthPayload,
	createRequestHandler,
	parseQuery,
	isSpaDocumentRequest,
};
