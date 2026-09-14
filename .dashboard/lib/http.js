'use strict';

const fs = require('fs');
const path = require('path');
const { DASHBOARD_CSP } = require('./csp');

const ASSET_TYPES = {
	'.css': 'text/css; charset=utf-8',
	'.js': 'application/javascript; charset=utf-8',
	'.map': 'application/json; charset=utf-8',
	'.svg': 'image/svg+xml',
	'.png': 'image/png',
	'.ico': 'image/x-icon',
	'.woff': 'font/woff',
	'.woff2': 'font/woff2',
};

const BUILD_REQUIRED_HTML = '<!DOCTYPE html><html><head><meta charset="utf-8"><title>FoxBot Dashboard</title></head><body><p>Dashboard frontend not built. Run <code>npm install</code> and <code>npm run build</code> in <code>.dashboard/</code>.</p></body></html>';

function createHttpHelpers({ indexPath, assetsDir, materialIconsDir, swaggerAssetsDir }) {
	function sendJson(res, status, body, extraHeaders = {}) {
		res.writeHead(status, {
			'Content-Type': 'application/json; charset=utf-8',
			'Cache-Control': 'no-store',
			'X-Content-Type-Options': 'nosniff',
			'X-Frame-Options': 'DENY',
			'Referrer-Policy': 'no-referrer',
			'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
			...extraHeaders,
		});
		res.end(JSON.stringify(body));
	}

	async function readJsonBody(req, limitBytes = 8 * 1024) {
		const chunks = [];
		let size = 0;
		for await (const chunk of req) {
			size += chunk.length;
			if (size > limitBytes) {
				const err = new Error('Request body too large');
				err.status = 413;
				err.code = 'AUTH_BODY_LARGE';
				throw err;
			}
			chunks.push(chunk);
		}
		const raw = Buffer.concat(chunks).toString('utf8').trim();
		if (!raw) return {};
		try {
			return JSON.parse(raw);
		}
		catch {
			const err = new Error('Invalid JSON');
			err.status = 400;
			err.code = 'AUTH_JSON';
			throw err;
		}
	}

	function sendUnauthorized(res) {
		sendJson(res, 401, { error: 'Not authenticated', code: 'error.auth' });
	}

	function sendHtml(res) {
		res.writeHead(200, {
			'Content-Type': 'text/html; charset=utf-8',
			'Cache-Control': 'no-store',
			'X-Content-Type-Options': 'nosniff',
			'X-Frame-Options': 'DENY',
			'Referrer-Policy': 'no-referrer',
			'Content-Security-Policy': DASHBOARD_CSP,
		});
		if (fs.existsSync(indexPath)) {
			res.end(fs.readFileSync(indexPath, 'utf8'));
		}
		else {
			res.end(BUILD_REQUIRED_HTML);
		}
	}

	function sendFile(res, filePath, { cache = 'no-store' } = {}) {
		if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
			res.writeHead(404, { 'Content-Type': 'text/plain' });
			res.end('Not found');
			return;
		}
		const ext = path.extname(filePath).toLowerCase();
		res.writeHead(200, {
			'Content-Type': ASSET_TYPES[ext] || 'application/octet-stream',
			'Cache-Control': cache,
			'X-Content-Type-Options': 'nosniff',
			'X-Frame-Options': 'DENY',
			'Referrer-Policy': 'no-referrer',
		});
		res.end(fs.readFileSync(filePath));
	}

	function sendAsset(res, urlPath) {
		const rel = urlPath.replace(/^\/assets\/?/, '');
		if (!rel || rel.includes('..') || path.isAbsolute(rel)) {
			res.writeHead(404, { 'Content-Type': 'text/plain' });
			res.end('Not found');
			return;
		}

		if (rel.startsWith('swagger-ui/') && swaggerAssetsDir) {
			const filePath = path.join(swaggerAssetsDir, rel.slice('swagger-ui/'.length));
			if (filePath.startsWith(swaggerAssetsDir)) {
				return sendFile(res, filePath, { cache: 'public, max-age=86400' });
			}
		}

		if (rel.startsWith('icons/materials/') && materialIconsDir) {
			let name = rel.slice('icons/materials/'.length);
			try {
				name = decodeURIComponent(name);
			}
			catch {
				res.writeHead(400, { 'Content-Type': 'text/plain' });
				res.end('Bad request');
				return;
			}
			name = name.replace(/ /g, '_');
			if (!name || name.includes('/') || name.includes('\\') || name.includes('..')) {
				res.writeHead(404, { 'Content-Type': 'text/plain' });
				res.end('Not found');
				return;
			}
			const filePath = path.join(materialIconsDir, name);
			if (!filePath.startsWith(materialIconsDir)) {
				res.writeHead(404, { 'Content-Type': 'text/plain' });
				res.end('Not found');
				return;
			}
			return sendFile(res, filePath, { cache: 'public, max-age=86400' });
		}

		const filePath = path.join(assetsDir, rel);
		if (!filePath.startsWith(assetsDir)) {
			res.writeHead(404, { 'Content-Type': 'text/plain' });
			res.end('Not found');
			return;
		}
		return sendFile(res, filePath);
	}

	return {
		sendJson,
		readJsonBody,
		sendUnauthorized,
		sendHtml,
		sendAsset,
	};
}

module.exports = { createHttpHelpers, ASSET_TYPES };
