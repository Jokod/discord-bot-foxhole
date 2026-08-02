#!/usr/bin/env node
'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const auth = require('./auth');
const { createHttpHelpers } = require('./lib/http');
const { createLoadSummary } = require('./lib/summary');
const { loadContacts } = require('./lib/contacts');

const PORT = Number(process.env.DASHBOARD_PORT) || 3847;
const HOST = process.env.DASHBOARD_HOST || '127.0.0.1';
const INDEX = path.join(__dirname, 'index.html');
const ASSETS_DIR = path.join(__dirname, 'assets');
const I18N_DIR = path.join(__dirname, 'i18n');
const I18N_FILES = new Set(['en.json', 'fr.json', 'ru.json', 'zh-CN.json']);
const ROOT = path.join(__dirname, '..');
const SHARED_WAR_PROGRESS = path.join(ROOT, 'shared', 'warProgress.js');
const ENV_FILE = process.env.DASHBOARD_ENV_FILE
	|| (fs.existsSync(path.join(ROOT, '.env.prod')) ? '.env.prod' : '.env');
const ENV_PATH = path.isAbsolute(ENV_FILE) ? ENV_FILE : path.join(ROOT, ENV_FILE);

require('dotenv').config({ path: ENV_PATH, quiet: true });

const {
	sendJson,
	readJsonBody,
	sendUnauthorized,
	sendHtml,
	sendAsset,
} = createHttpHelpers({
	indexPath: INDEX,
	assetsDir: ASSETS_DIR,
	sharedWarProgressPath: SHARED_WAR_PROGRESS,
});

const loadSummary = createLoadSummary(ENV_PATH);

async function main() {
	const url = process.env.MONGODB_URL;
	if (!url) {
		console.error('MONGODB_URL requis (.env à la racine du projet).');
		process.exit(1);
	}

	const dbName = process.env.MONGODB_NAME || undefined;
	await mongoose.connect(url, dbName ? { dbName } : undefined);
	await auth.ensureDefaultAdmin();
	console.log(`[dashboard] env=${path.basename(ENV_PATH)} db=${dbName || '(from URL)'} → http://${HOST}:${PORT}`);

	const server = http.createServer(async (req, res) => {
		try {
			const method = req.method || 'GET';
			const urlPath = (req.url || '/').split('?')[0];

			if (urlPath === '/api/health' && method === 'GET') {
				return sendJson(res, 200, { ok: true });
			}

			if (urlPath === '/api/me' && method === 'GET') {
				const session = auth.requireSession(req);
				if (!session) return sendJson(res, 200, { authenticated: false });
				return sendJson(res, 200, {
					authenticated: true,
					username: session.username,
					isDefault: session.isDefault,
				});
			}

			if ((urlPath === '/favicon.ico') && method === 'GET') {
				res.writeHead(204, { 'Cache-Control': 'public, max-age=86400' });
				res.end();
				return;
			}

			if (urlPath === '/api/login' && method === 'POST') {
				auth.assertSameOrigin(req);
				const body = await readJsonBody(req);
				const user = await auth.validateLogin(body.username, body.password, req);
				if (!user) return sendJson(res, 401, { error: 'Invalid credentials', code: 'AUTH_INVALID' });
				auth.destroySession(auth.sessionIdFromReq(req));
				const sid = auth.createSession(user);
				auth.setSessionCookie(res, sid);
				return sendJson(res, 200, {
					authenticated: true,
					username: user.username,
					isDefault: user.isDefault,
				});
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
				if (!I18N_FILES.has(name) || name.includes('..')) {
					res.writeHead(404, { 'Content-Type': 'text/plain', 'X-Content-Type-Options': 'nosniff' });
					res.end('Not found');
					return;
				}
				const filePath = path.join(I18N_DIR, name);
				if (!filePath.startsWith(I18N_DIR) || !fs.existsSync(filePath)) {
					res.writeHead(404, { 'Content-Type': 'text/plain', 'X-Content-Type-Options': 'nosniff' });
					res.end('Not found');
					return;
				}
				res.writeHead(200, {
					'Content-Type': 'application/json; charset=utf-8',
					'Cache-Control': 'no-store',
					'X-Content-Type-Options': 'nosniff',
				});
				res.end(fs.readFileSync(filePath));
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
				const sid = auth.createSession(updated);
				auth.setSessionCookie(res, sid);
				return sendJson(res, 200, {
					authenticated: true,
					username: updated.username,
					isDefault: updated.isDefault,
				});
			}

			if (session.isDefault) {
				return sendJson(res, 403, {
					error: 'Change default password in Profile first',
					code: 'AUTH_DEFAULT_BLOCK',
				});
			}

			if (urlPath === '/api/summary' && method === 'GET') {
				return sendJson(res, 200, await loadSummary());
			}
			if (urlPath === '/api/contacts' && method === 'GET') {
				const force = (req.url || '').includes('force=1');
				return sendJson(res, 200, await loadContacts({ force }));
			}

			res.writeHead(404, { 'Content-Type': 'text/plain', 'X-Content-Type-Options': 'nosniff' });
			res.end('Not found');
		}
		catch (err) {
			console.error(err);
			sendJson(res, err.status || 500, {
				error: err.message || 'Internal error',
				code: err.code || undefined,
				params: err.params || undefined,
			});
		}
	});

	server.listen(PORT, HOST, () => {
		console.log(`[dashboard] http://${HOST}:${PORT}`);
	});
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
