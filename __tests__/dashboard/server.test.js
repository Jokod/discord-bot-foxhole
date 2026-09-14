'use strict';

const mockListen = jest.fn((port, host, cb) => {
	if (typeof cb === 'function') cb();
	return { listen: mockListen };
});
const mockCreateServer = jest.fn(() => ({
	listen: mockListen,
}));

jest.mock('http', () => ({
	createServer: (...args) => mockCreateServer(...args),
}));

const path = require('path');

const { loadServerModule, mockConnect } = require('./helpers/load-server-module');

const mockEnsureDefaultAdmin = jest.fn().mockResolvedValue(undefined);
jest.mock('../../.dashboard/lib/auth', () => ({
	ensureDefaultAdmin: (...args) => mockEnsureDefaultAdmin(...args),
}));

const mockSendJson = jest.fn();
jest.mock('../../.dashboard/lib/http', () => ({
	createHttpHelpers: () => ({
		sendJson: mockSendJson,
		readJsonBody: jest.fn(),
		sendUnauthorized: jest.fn(),
		sendHtml: jest.fn(),
		sendAsset: jest.fn(),
	}),
}));

jest.mock('../../.dashboard/lib/summary', () => ({
	createLoadSummary: () => jest.fn(),
}));

jest.mock('../../.dashboard/lib/contacts', () => ({
	loadContacts: jest.fn(),
}));

jest.mock('../../.dashboard/lib/guildActions', () => ({}));

jest.mock('../../.dashboard/lib/materials', () => ({
	listCatalog: jest.fn(async () => []),
}));

jest.mock('../../.dashboard/lib/api/tokens', () => ({
	validateJwtSecretAtBoot: jest.fn(),
	ensureTokenIndexes: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../.dashboard/lib/wiki/sync', () => ({
	defaultStore: {},
}));

jest.mock('../../.dashboard/lib/api/public', () => ({
	createPublicDataLoader: () => jest.fn(),
}));

const mockRequestHandler = jest.fn().mockResolvedValue(undefined);
jest.mock('../../.dashboard/lib/createHandler', () => ({
	createAuthPayload: jest.fn(() => jest.fn()),
	createRequestHandler: jest.fn(() => mockRequestHandler),
	publicLinks: { discord: null, github: null },
}));

jest.mock('dotenv', () => ({
	config: jest.fn(),
}));

describe('dashboard server', () => {
	const prevUrl = process.env.MONGODB_URL;
	const prevName = process.env.MONGODB_NAME;
	const prevPort = process.env.DASHBOARD_PORT;
	const prevHost = process.env.DASHBOARD_HOST;

	beforeEach(() => {
		jest.clearAllMocks();
		jest.resetModules();
		process.env.MONGODB_URL = 'mongodb://localhost:27017/test';
		process.env.MONGODB_NAME = 'fox-test';
		process.env.DASHBOARD_PORT = '3999';
		process.env.DASHBOARD_HOST = '127.0.0.1';
		mockListen.mockImplementation((port, host, cb) => {
			if (typeof cb === 'function') cb();
		});
		mockCreateServer.mockImplementation(() => ({ listen: mockListen }));
		mockConnect.mockResolvedValue(undefined);
		mockEnsureDefaultAdmin.mockResolvedValue(undefined);
		mockRequestHandler.mockResolvedValue(undefined);
	});

	afterAll(() => {
		process.env.MONGODB_URL = prevUrl;
		process.env.MONGODB_NAME = prevName;
		process.env.DASHBOARD_PORT = prevPort;
		process.env.DASHBOARD_HOST = prevHost;
	});

	it('exporte main, requestHandler et métadonnées', () => {
		const server = loadServerModule();
		expect(typeof server.main).toBe('function');
		expect(typeof server.requestHandler).toBe('function');
		expect(typeof server.loadMaterials).toBe('function');
		expect(typeof server.runCli).toBe('function');
		expect(server.publicLinks).toBeDefined();
		expect(server.ENV_PATH).toEqual(expect.any(String));
	});

	it('loadMaterials délègue à listCatalog', async () => {
		const { listCatalog } = require('../../.dashboard/lib/materials');
		listCatalog.mockResolvedValueOnce([{ id: 'mat-1' }]);
		const server = loadServerModule();
		await expect(server.loadMaterials()).resolves.toEqual([{ id: 'mat-1' }]);
		expect(listCatalog).toHaveBeenCalled();
	});

	it('utilise DASHBOARD_ENV_FILE quand défini', () => {
		process.env.DASHBOARD_ENV_FILE = '/custom/path/.env.special';
		const server = loadServerModule();
		expect(server.ENV_PATH).toBe('/custom/path/.env.special');
		delete process.env.DASHBOARD_ENV_FILE;
	});

	it('ENV_PATH préfère .env si présent', () => {
		delete process.env.DASHBOARD_ENV_FILE;
		const fs = require('fs');
		const actualExistsSync = fs.existsSync;
		const existsSpy = jest.spyOn(fs, 'existsSync').mockImplementation((p) => {
			if (String(p).endsWith(`${path.sep}.env`) || String(p).endsWith('/.env')) return true;
			return actualExistsSync.call(fs, p);
		});
		try {
			const server = loadServerModule();
			expect(server.ENV_PATH).toMatch(/\.env$/);
			expect(server.ENV_PATH).not.toMatch(/\.env\.prod$/);
		}
		finally {
			existsSpy.mockRestore();
		}
	});

	it('ENV_PATH utilise .env.prod si .env absent', () => {
		delete process.env.DASHBOARD_ENV_FILE;
		const fs = require('fs');
		const actualExistsSync = fs.existsSync;
		const existsSpy = jest.spyOn(fs, 'existsSync').mockImplementation((p) => {
			if (String(p).endsWith(`${path.sep}.env`) || String(p).endsWith('/.env')) return false;
			if (String(p).endsWith('.env.prod')) return true;
			return actualExistsSync.call(fs, p);
		});
		try {
			const server = loadServerModule();
			expect(server.ENV_PATH).toMatch(/\.env\.prod$/);
		}
		finally {
			existsSpy.mockRestore();
		}
	});

	it('le serveur HTTP envoie message par défaut si err.message absent', async () => {
		mockRequestHandler.mockRejectedValueOnce({ status: 418 });
		const server = loadServerModule();
		const log = jest.spyOn(console, 'log').mockImplementation(() => undefined);
		const err = jest.spyOn(console, 'error').mockImplementation(() => undefined);
		await server.main();
		const handler = mockCreateServer.mock.calls[0][0];
		const res = {};
		await handler({}, res);
		expect(mockSendJson).toHaveBeenCalledWith(res, 418, {
			error: 'Error',
			code: undefined,
			params: undefined,
		}, {});
		log.mockRestore();
		err.mockRestore();
	});

	it('maybeRunCliAsMain appelle runCli quand isMain true', async () => {
		const server = loadServerModule();
		const log = jest.spyOn(console, 'log').mockImplementation(() => undefined);
		await server.maybeRunCliAsMain(true);
		expect(mockConnect).toHaveBeenCalled();
		log.mockRestore();
	});

	it('main exit 1 sans MONGODB_URL', async () => {
		const exit = jest.spyOn(process, 'exit').mockImplementation(() => {
			throw new Error('exit');
		});
		const err = jest.spyOn(console, 'error').mockImplementation(() => undefined);
		process.env.MONGODB_URL = '';
		const server = loadServerModule();
		await expect(server.main()).rejects.toThrow('exit');
		expect(exit).toHaveBeenCalledWith(1);
		expect(mockConnect).not.toHaveBeenCalled();
		exit.mockRestore();
		err.mockRestore();
	});

	it('main logue erreur si ensureTokenIndexes échoue', async () => {
		const { ensureTokenIndexes } = require('../../.dashboard/lib/api/tokens');
		ensureTokenIndexes.mockRejectedValueOnce(new Error('index fail'));
		const server = loadServerModule();
		const log = jest.spyOn(console, 'log').mockImplementation(() => undefined);
		const err = jest.spyOn(console, 'error').mockImplementation(() => undefined);
		await server.main();
		expect(err).toHaveBeenCalledWith('[dashboard] API token indexes failed', 'index fail');
		log.mockRestore();
		err.mockRestore();
	});

	it('main logue erreur index sans message', async () => {
		const { ensureTokenIndexes } = require('../../.dashboard/lib/api/tokens');
		const bare = { code: 'INDEX_FAIL' };
		ensureTokenIndexes.mockRejectedValueOnce(bare);
		const server = loadServerModule();
		const log = jest.spyOn(console, 'log').mockImplementation(() => undefined);
		const err = jest.spyOn(console, 'error').mockImplementation(() => undefined);
		await server.main();
		expect(err).toHaveBeenCalledWith('[dashboard] API token indexes failed', bare);
		log.mockRestore();
		err.mockRestore();
	});

	it('main connecte Mongo, ensure admin et écoute', async () => {
		const server = loadServerModule();
		const log = jest.spyOn(console, 'log').mockImplementation(() => undefined);
		await server.main();
		expect(mockConnect).toHaveBeenCalledWith(
			'mongodb://localhost:27017/test',
			{ dbName: 'fox-test' },
		);
		expect(mockEnsureDefaultAdmin).toHaveBeenCalled();
		expect(mockCreateServer).toHaveBeenCalled();
		expect(mockListen).toHaveBeenCalledWith(3999, '127.0.0.1', expect.any(Function));
		log.mockRestore();
	});

	it('le serveur HTTP envoie 500 si requestHandler throw', async () => {
		mockRequestHandler.mockRejectedValueOnce(Object.assign(new Error('boom'), {
			status: 503,
			code: 'X',
			params: { a: 1 },
		}));
		const server = loadServerModule();
		const log = jest.spyOn(console, 'log').mockImplementation(() => undefined);
		const err = jest.spyOn(console, 'error').mockImplementation(() => undefined);
		await server.main();
		const handler = mockCreateServer.mock.calls[0][0];
		const res = {};
		await handler({}, res);
		expect(mockSendJson).toHaveBeenCalledWith(res, 503, {
			error: 'boom',
			code: 'X',
			params: { a: 1 },
		}, {});
		log.mockRestore();
		err.mockRestore();
	});

	it('le serveur HTTP propage retry_after_ms et Retry-After sur 429', async () => {
		mockRequestHandler.mockRejectedValueOnce(Object.assign(new Error('Rate limit'), {
			status: 429,
			code: 'API_RATE_LIMIT',
			retry_after_ms: 1500,
		}));
		const server = loadServerModule();
		const log = jest.spyOn(console, 'log').mockImplementation(() => undefined);
		const err = jest.spyOn(console, 'error').mockImplementation(() => undefined);
		await server.main();
		const handler = mockCreateServer.mock.calls[0][0];
		const res = {};
		await handler({}, res);
		expect(mockSendJson).toHaveBeenCalledWith(res, 429, {
			error: 'Rate limit',
			code: 'API_RATE_LIMIT',
			params: undefined,
			retry_after_ms: 1500,
		}, { 'Retry-After': '2' });
		log.mockRestore();
		err.mockRestore();
	});

	it('main sans MONGODB_NAME connecte sans dbName', async () => {
		process.env.MONGODB_NAME = '';
		mockConnect.mockClear();
		const server = loadServerModule();
		const log = jest.spyOn(console, 'log').mockImplementation(() => undefined);
		await server.main();
		expect(mockConnect).toHaveBeenLastCalledWith('mongodb://localhost:27017/test', undefined);
		log.mockRestore();
	});

	it('require.main catch logue et exit 1 si main échoue', () => {
		const { spawnSync } = require('child_process');
		const root = path.join(__dirname, '../..');
		const result = spawnSync(
			process.execPath,
			[
				'-r', path.join(root, '__tests__/dashboard/helpers/patch-mongoose-connect.js'),
				path.join(root, '.dashboard/server.js'),
			],
			{ encoding: 'utf8', cwd: root },
		);
		expect(result.status).toBe(1);
		expect(result.stderr).toMatch(/connect fail/);
	});

	it('runCli exit 1 si main échoue', async () => {
		mockConnect.mockRejectedValueOnce(new Error('connect fail'));
		const server = loadServerModule();
		const exit = jest.spyOn(process, 'exit').mockImplementation(() => {
			throw new Error('exit');
		});
		const err = jest.spyOn(console, 'error').mockImplementation(() => undefined);
		await expect(server.runCli()).rejects.toThrow('exit');
		expect(exit).toHaveBeenCalledWith(1);
		exit.mockRestore();
		err.mockRestore();
	});

	it('choisit favicon dist quand présent', () => {
		const fs = require('fs');
		const actualExistsSync = fs.existsSync;
		const existsSpy = jest.spyOn(fs, 'existsSync').mockImplementation((p) => {
			if (String(p).includes(`${path.sep}dist${path.sep}favicon.ico`)) return true;
			if (String(p).endsWith('.env.prod')) return false;
			return actualExistsSync.call(fs, p);
		});
		try {
			loadServerModule();
			expect(existsSpy).toHaveBeenCalled();
		}
		finally {
			existsSpy.mockRestore();
		}
	});

	it('choisit favicon public quand dist absent', () => {
		const fs = require('fs');
		const actualExistsSync = fs.existsSync;
		const existsSpy = jest.spyOn(fs, 'existsSync').mockImplementation((p) => {
			if (String(p).includes(`${path.sep}dist${path.sep}favicon.ico`)) return false;
			if (String(p).endsWith('.env.prod')) return false;
			return actualExistsSync.call(fs, p);
		});
		try {
			loadServerModule();
			expect(existsSpy).toHaveBeenCalledWith(
				expect.stringMatching(/dist[/\\]favicon\.ico$/),
			);
		}
		finally {
			existsSpy.mockRestore();
		}
	});

	it('utilise PORT/HOST par défaut et .env si présent', async () => {
		delete process.env.DASHBOARD_PORT;
		delete process.env.DASHBOARD_HOST;
		delete process.env.DASHBOARD_ENV_FILE;
		const fs = require('fs');
		const actualExistsSync = fs.existsSync;
		const existsSpy = jest.spyOn(fs, 'existsSync').mockImplementation((p) => {
			if (String(p).endsWith(`${path.sep}.env`) || String(p).endsWith('/.env')) return true;
			return actualExistsSync.call(fs, p);
		});
		try {
			const server = loadServerModule();
			expect(server.ENV_PATH).toMatch(/\.env$/);
			expect(server.ENV_PATH).not.toMatch(/\.env\.prod$/);
			const log = jest.spyOn(console, 'log').mockImplementation(() => undefined);
			try {
				await server.main();
				expect(mockListen).toHaveBeenCalledWith(3847, '127.0.0.1', expect.any(Function));
			}
			finally {
				log.mockRestore();
			}
		}
		finally {
			existsSpy.mockRestore();
		}
	});

	it('le serveur HTTP envoie 500 pour erreur générique sans status', async () => {
		mockRequestHandler.mockRejectedValueOnce(new Error('plain'));
		const server = loadServerModule();
		const log = jest.spyOn(console, 'log').mockImplementation(() => undefined);
		const err = jest.spyOn(console, 'error').mockImplementation(() => undefined);
		await server.main();
		const handler = mockCreateServer.mock.calls[0][0];
		const res = {};
		await handler({}, res);
		expect(mockSendJson).toHaveBeenCalledWith(res, 500, {
			error: 'Internal error',
			code: undefined,
			params: undefined,
		}, {});
		log.mockRestore();
		err.mockRestore();
	});
});
