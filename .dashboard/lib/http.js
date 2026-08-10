'use strict';

const fs = require('fs');
const path = require('path');

const ASSET_TYPES = {
	'.css': 'text/css; charset=utf-8',
	'.js': 'application/javascript; charset=utf-8',
	'.map': 'application/json; charset=utf-8',
	'.svg': 'image/svg+xml',
	'.png': 'image/png',
	'.ico': 'image/x-icon',
};

function createHttpHelpers({ indexPath, assetsDir, sharedWarProgressPath }) {
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
			'Content-Security-Policy':
				'default-src \'self\'; script-src \'self\' https://cdn.jsdelivr.net; style-src \'self\' https://fonts.googleapis.com \'unsafe-inline\'; font-src https://fonts.gstatic.com; img-src \'self\' https://cdn.discordapp.com data:; connect-src \'self\'; frame-ancestors \'none\'; base-uri \'self\'; form-action \'self\'',
		});
		res.end(fs.readFileSync(indexPath, 'utf8'));
	}

	function sendAsset(res, urlPath) {
		const rel = urlPath.replace(/^\/assets\/?/, '');
		if (!rel || rel.includes('..') || path.isAbsolute(rel)) {
			res.writeHead(404, { 'Content-Type': 'text/plain' });
			res.end('Not found');
			return;
		}

		let filePath;
		if (rel === 'war-progress.js') {
			filePath = sharedWarProgressPath;
		}
		else {
			filePath = path.join(assetsDir, rel);
			if (!filePath.startsWith(assetsDir)) {
				res.writeHead(404, { 'Content-Type': 'text/plain' });
				res.end('Not found');
				return;
			}
		}

		if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
			res.writeHead(404, { 'Content-Type': 'text/plain' });
			res.end('Not found');
			return;
		}
		const ext = path.extname(filePath).toLowerCase();
		res.writeHead(200, {
			'Content-Type': ASSET_TYPES[ext] || 'application/octet-stream',
			'Cache-Control': 'no-store',
			'X-Content-Type-Options': 'nosniff',
			'X-Frame-Options': 'DENY',
			'Referrer-Policy': 'no-referrer',
		});
		res.end(fs.readFileSync(filePath));
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
