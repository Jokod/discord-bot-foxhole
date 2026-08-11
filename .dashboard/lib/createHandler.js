'use strict';

const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

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

function createAuthPayload({ auth, envPath, env = process.env }) {
	return async function authPayload(session, extras = {}) {
		const creds = await auth.getCredentials();
		return {
			authenticated: true,
			username: session.username,
			isDefault: session.isDefault,
			links: publicLinks(env),
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

		if ((urlPath === '/' || urlPath === '/index.html') && method === 'GET') {
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
				error: 'Change default password in Profile first',
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
		if (urlPath === '/api/materials' && method === 'GET') {
			return sendJson(res, 200, await loadMaterials());
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
};
