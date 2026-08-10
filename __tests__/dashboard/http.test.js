'use strict';

const { Readable } = require('stream');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { createHttpHelpers } = require('../../.dashboard/lib/http');

function mockRes() {
	return {
		statusCode: null,
		headers: null,
		body: null,
		writeHead(status, headers) {
			this.statusCode = status;
			this.headers = headers;
		},
		end(chunk) {
			this.body = chunk;
		},
	};
}

describe('dashboard http helpers', () => {
	const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'dash-http-'));
	const indexPath = path.join(tmp, 'index.html');
	const assetsDir = path.join(tmp, 'assets');
	const warPath = path.join(tmp, 'war-progress.js');

	beforeAll(() => {
		fs.mkdirSync(assetsDir);
		fs.writeFileSync(indexPath, '<html>ok</html>');
		fs.writeFileSync(path.join(assetsDir, 'app.js'), 'console.log(1)');
		fs.writeFileSync(warPath, 'module.exports = {}');
	});

	afterAll(() => {
		fs.rmSync(tmp, { recursive: true, force: true });
	});

	const helpers = createHttpHelpers({
		indexPath,
		assetsDir,
		sharedWarProgressPath: warPath,
	});

	const iconsDir = path.join(tmp, 'material-icons');
	fs.mkdirSync(iconsDir, { recursive: true });
	fs.writeFileSync(path.join(iconsDir, 'BasicMaterialsIcon.png'), Buffer.from([137, 80, 78, 71]));
	const helpersWithIcons = createHttpHelpers({
		indexPath,
		assetsDir,
		sharedWarProgressPath: warPath,
		materialIconsDir: iconsDir,
	});

	it('sendJson writes secured json headers', () => {
		const res = mockRes();
		helpers.sendJson(res, 200, { ok: true });
		expect(res.statusCode).toBe(200);
		expect(res.headers['Content-Type']).toContain('application/json');
		expect(res.headers['X-Frame-Options']).toBe('DENY');
		expect(JSON.parse(res.body)).toEqual({ ok: true });
	});

	it('sendUnauthorized returns auth error payload', () => {
		const res = mockRes();
		helpers.sendUnauthorized(res);
		expect(res.statusCode).toBe(401);
		expect(JSON.parse(res.body).code).toBe('error.auth');
	});

	it('sendHtml serves index with CSP', () => {
		const res = mockRes();
		helpers.sendHtml(res);
		expect(res.statusCode).toBe(200);
		expect(res.headers['Content-Security-Policy']).toContain('default-src');
		expect(res.body).toContain('<html>ok</html>');
	});

	it('sendAsset serves files and rejects traversal', () => {
		const ok = mockRes();
		helpers.sendAsset(ok, '/assets/app.js');
		expect(ok.statusCode).toBe(200);
		expect(ok.body.toString()).toBe('console.log(1)');

		const war = mockRes();
		helpers.sendAsset(war, '/assets/war-progress.js');
		expect(war.statusCode).toBe(200);

		const bad = mockRes();
		helpers.sendAsset(bad, '/assets/../index.html');
		expect(bad.statusCode).toBe(404);
	});

	it('sendAsset serves material icons from materialIconsDir', () => {
		const ok = mockRes();
		helpersWithIcons.sendAsset(ok, '/assets/icons/materials/BasicMaterialsIcon.png');
		expect(ok.statusCode).toBe(200);
		expect(ok.headers['Content-Type']).toBe('image/png');
		expect(ok.headers['Cache-Control']).toContain('max-age');

		const traversal = mockRes();
		helpersWithIcons.sendAsset(traversal, '/assets/icons/materials/../app.js');
		expect(traversal.statusCode).toBe(404);

		const missing = mockRes();
		helpersWithIcons.sendAsset(missing, '/assets/icons/materials/Nope.png');
		expect(missing.statusCode).toBe(404);
	});

	it('readJsonBody parses, rejects invalid json and oversized body', async () => {
		const empty = Readable.from([]);
		await expect(helpers.readJsonBody(empty)).resolves.toEqual({});

		const good = Readable.from([Buffer.from('{"a":1}')]);
		await expect(helpers.readJsonBody(good)).resolves.toEqual({ a: 1 });

		const bad = Readable.from([Buffer.from('{nope')]);
		await expect(helpers.readJsonBody(bad)).rejects.toMatchObject({ status: 400, code: 'AUTH_JSON' });

		const huge = Readable.from([Buffer.alloc(100)]);
		await expect(helpers.readJsonBody(huge, 10)).rejects.toMatchObject({ status: 413, code: 'AUTH_BODY_LARGE' });
	});
});
