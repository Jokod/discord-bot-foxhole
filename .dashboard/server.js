#!/usr/bin/env node
'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const mongoose = require('./lib/db');
const auth = require('./lib/auth');
const { createHttpHelpers } = require('./lib/http');
const { createLoadSummary } = require('./lib/summary');
const { loadContacts } = require('./lib/contacts');
const guildActions = require('./lib/guildActions');
const { createAuthPayload, createRequestHandler, publicLinks } = require('./lib/createHandler');
const { listCatalog } = require('./lib/materials');
const { defaultStore: wikiSyncStore } = require('./lib/wiki/sync');
const { createPublicDataLoader } = require('./lib/api/public');
const { validateJwtSecretAtBoot, ensureTokenIndexes } = require('./lib/api/tokens');

const PORT = Number(process.env.DASHBOARD_PORT) || 3847;
const HOST = process.env.DASHBOARD_HOST || '127.0.0.1';
const DIST = path.join(__dirname, 'dist');
const INDEX = path.join(DIST, 'index.html');
const ASSETS_DIR = path.join(DIST, 'assets');
const FAVICON = fs.existsSync(path.join(DIST, 'favicon.ico'))
	? path.join(DIST, 'favicon.ico')
	: path.join(__dirname, 'web', 'public', 'favicon.ico');
const SWAGGER_ASSETS = path.join(__dirname, 'node_modules', 'swagger-ui-dist');
const MATERIAL_ICONS_DIR = path.join(__dirname, '..', 'assets', 'icons', 'materials');
const I18N_DIR = path.join(__dirname, 'i18n');
const I18N_FILES = new Set(['en.json', 'es.json', 'fr.json', 'ru.json', 'zh-CN.json']);
const ROOT = path.join(__dirname, '..');
const SWAGGER_HTML = path.join(__dirname, 'docs', 'swagger.html');
const ENV_FILE = process.env.DASHBOARD_ENV_FILE
	|| (fs.existsSync(path.join(ROOT, '.env')) ? '.env' : '.env.prod');
const ENV_PATH = path.isAbsolute(ENV_FILE) ? ENV_FILE : path.join(ROOT, ENV_FILE);

require('dotenv').config({ path: ENV_PATH, quiet: true });
console.log(`[dashboard] env file: ${ENV_FILE}`);

const {
	sendJson,
	readJsonBody,
	sendUnauthorized,
	sendHtml,
	sendAsset,
} = createHttpHelpers({
	indexPath: INDEX,
	assetsDir: ASSETS_DIR,
	materialIconsDir: MATERIAL_ICONS_DIR,
	swaggerAssetsDir: SWAGGER_ASSETS,
});

const loadSummary = createLoadSummary(ENV_PATH);
const handlePublicData = createPublicDataLoader(ENV_PATH);
const authPayload = createAuthPayload({ auth, envPath: ENV_PATH, wikiSyncStore });
const loadMaterials = async () => listCatalog();

const requestHandler = createRequestHandler({
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
	publicLinks,
	faviconPath: FAVICON,
	i18nDir: I18N_DIR,
	i18nFiles: I18N_FILES,
	wikiSyncStore,
	handlePublicData,
	swaggerHtmlPath: SWAGGER_HTML,
});

async function main() {
	const url = process.env.MONGODB_URL;
	if (!url) {
		console.error('MONGODB_URL requis (.env à la racine du projet).');
		process.exit(1);
	}

	validateJwtSecretAtBoot();

	const dbName = process.env.MONGODB_NAME || undefined;
	await mongoose.connect(url, dbName ? { dbName } : undefined);
	await auth.ensureDefaultAdmin();
	await ensureTokenIndexes().catch((err) => {
		console.error('[dashboard] API token indexes failed', err.message || err);
	});
	console.log(`[dashboard] env=${path.basename(ENV_PATH)} db=${dbName || '(from URL)'} → http://${HOST}:${PORT}`);

	const server = http.createServer(async (req, res) => {
		try {
			await requestHandler(req, res);
		}
		catch (err) {
			console.error(err);
			const status = Number(err.status) || 500;
			const expose = Boolean(err.code) || (status >= 400 && status < 500);
			const body = {
				error: expose ? (err.message || 'Error') : 'Internal error',
				code: err.code || undefined,
				params: err.params || undefined,
			};
			if (err.retry_after_ms != null) body.retry_after_ms = err.retry_after_ms;
			const headers = {};
			if (status === 429 && Number.isFinite(err.retry_after_ms) && err.retry_after_ms > 0) {
				headers['Retry-After'] = String(Math.ceil(err.retry_after_ms / 1000));
			}
			sendJson(res, status, body, headers);
		}
	});

	server.listen(PORT, HOST, () => {
		console.log(`[dashboard] http://${HOST}:${PORT}`);
	});
}

function runCli() {
	return main().catch((err) => {
		console.error(err);
		process.exit(1);
	});
}

function maybeRunCliAsMain(isMain = require.main === module) {
	if (isMain) {
		runCli();
	}
}

maybeRunCliAsMain();

module.exports = {
	main,
	runCli,
	maybeRunCliAsMain,
	requestHandler,
	loadMaterials,
	publicLinks,
	authPayload,
	ENV_PATH,
};
