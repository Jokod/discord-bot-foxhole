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
const guildActions = require('./lib/guildActions');
const { createAuthPayload, createRequestHandler, publicLinks } = require('./lib/createHandler');
const { listCatalog } = require('./lib/materials');

const PORT = Number(process.env.DASHBOARD_PORT) || 3847;
const HOST = process.env.DASHBOARD_HOST || '127.0.0.1';
const INDEX = path.join(__dirname, 'index.html');
const FAVICON = path.join(__dirname, 'favicon.ico');
const ASSETS_DIR = path.join(__dirname, 'assets');
const MATERIAL_ICONS_DIR = path.join(__dirname, '..', 'assets', 'icons', 'materials');
const I18N_DIR = path.join(__dirname, 'i18n');
const I18N_FILES = new Set(['en.json', 'es.json', 'fr.json', 'ru.json', 'zh-CN.json']);
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
	materialIconsDir: MATERIAL_ICONS_DIR,
});

const loadSummary = createLoadSummary(ENV_PATH);
const authPayload = createAuthPayload({ auth, envPath: ENV_PATH });
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
});

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
			await requestHandler(req, res);
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
