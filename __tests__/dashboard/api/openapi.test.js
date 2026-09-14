'use strict';

const fs = require('fs');
const openapi = require('../../../.dashboard/lib/api/openapi');
const {
	filterOpenApiSpec,
	isOpenApiRouteEnabled,
	resetSpecCacheForTests,
	assertSpecMatchesScopeRoutes,
	loadBaseSpec,
	buildInfoDescription,
	SPEC_PATH,
} = openapi;

describe('openapi', () => {
	const prev = { ...process.env };

	beforeEach(() => {
		resetSpecCacheForTests();
		process.env.DASHBOARD_API = '1';
		process.env.DASHBOARD_API_DOCS = '1';
		process.env.DASHBOARD_API_MATERIALS = '1';
		process.env.DASHBOARD_API_DATA = '1';
		process.env.DASHBOARD_API_GUILDS = '0';
	});

	afterEach(() => {
		process.env = { ...prev };
		resetSpecCacheForTests();
	});

	it('filterOpenApiSpec avec aucun scope actif', () => {
		process.env.DASHBOARD_API_MATERIALS = '0';
		process.env.DASHBOARD_API_DATA = '0';
		process.env.DASHBOARD_API_GUILDS = '0';
		const spec = filterOpenApiSpec();
		expect(spec.paths).toEqual({});
		expect(spec.info.description).toContain('_No scopes enabled');
	});

	it('filters paths by enabled scopes', () => {
		const spec = filterOpenApiSpec();
		expect(spec.paths['/api/public/materials/categories']).toBeDefined();
		expect(spec.paths['/api/public/materials/items']).toBeDefined();
		expect(spec.paths['/api/public/data']).toBeDefined();
		expect(spec.paths['/api/public/guilds']).toBeUndefined();
	});

	it('isOpenApiRouteEnabled requires docs flag', () => {
		expect(isOpenApiRouteEnabled()).toBe(true);
		process.env.DASHBOARD_API_DOCS = '0';
		expect(isOpenApiRouteEnabled()).toBe(false);
	});

	it('includes BearerJWT security scheme', () => {
		const spec = filterOpenApiSpec();
		expect(spec.components.securitySchemes.BearerJWT.scheme).toBe('bearer');
	});

	it('builds markdown info description with scopes and routes', () => {
		const spec = filterOpenApiSpec();
		expect(spec.info.description).toContain('### Quick start');
		expect(spec.info.description).toContain('### Active scopes on this server');
		expect(spec.info.description).toContain('#### `materials`');
		expect(spec.info.description).toContain('GET /api/public/materials/items');
		expect(spec.info.description).not.toContain('#### `guilds`');
	});

	it('openapi.json defines every scoped route', () => {
		expect(() => assertSpecMatchesScopeRoutes()).not.toThrow();
	});

	it('loadBaseSpec caches by mtime', () => {
		const first = loadBaseSpec();
		const second = loadBaseSpec();
		expect(second).toBe(first);
		const stat = fs.statSync(SPEC_PATH);
		const readSpy = jest.spyOn(fs, 'readFileSync');
		jest.spyOn(fs, 'statSync').mockReturnValue({ mtimeMs: stat.mtimeMs });
		expect(loadBaseSpec()).toBe(first);
		expect(readSpy).not.toHaveBeenCalled();
		readSpy.mockRestore();
		fs.statSync.mockRestore?.();
	});

	it('buildInfoDescription without scopes', () => {
		expect(buildInfoDescription([])).toContain('_No scopes enabled on this instance._');
	});

	it('assertSpecMatchesScopeRoutes throws when paths missing', () => {
		expect(() => assertSpecMatchesScopeRoutes({ paths: {} }))
			.toThrow(/OpenAPI spec missing paths/);
	});

	it('buildInfoDescription sans résumé pour scope inconnu', () => {
		const text = buildInfoDescription(['unknown']);
		expect(text).toContain('#### `unknown`');
		expect(text).not.toContain('Materials catalogue');
	});

	it('filterOpenApiSpec ignore paths absents du spec de base', () => {
		resetSpecCacheForTests();
		const existsSpy = jest.spyOn(fs, 'existsSync').mockReturnValue(true);
		const statSpy = jest.spyOn(fs, 'statSync').mockReturnValue({ mtimeMs: 999 });
		const readSpy = jest.spyOn(fs, 'readFileSync').mockReturnValue(JSON.stringify({
			paths: {},
			tags: [{ name: 'Materials' }, { name: 'Data' }],
			info: { title: 'FoxBot' },
		}));
		process.env.DASHBOARD_API_MATERIALS = '1';
		process.env.DASHBOARD_API_DATA = '1';
		const spec = filterOpenApiSpec();
		expect(spec.paths).toEqual({});
		expect(spec.tags).toEqual([{ name: 'Materials' }, { name: 'Data' }]);
		existsSpy.mockRestore();
		statSpy.mockRestore();
		readSpy.mockRestore();
		resetSpecCacheForTests();
	});

	it('filterOpenApiSpec filtre tags hors scopes actifs', () => {
		resetSpecCacheForTests();
		const existsSpy = jest.spyOn(fs, 'existsSync').mockReturnValue(true);
		const statSpy = jest.spyOn(fs, 'statSync').mockReturnValue({ mtimeMs: 1001 });
		const readSpy = jest.spyOn(fs, 'readFileSync').mockReturnValue(JSON.stringify({
			paths: { '/api/public/guilds': { get: {} } },
			tags: [{ name: 'Guilds' }, { name: 'Legacy' }],
			info: { title: 'FoxBot' },
		}));
		process.env.DASHBOARD_API_GUILDS = '1';
		process.env.DASHBOARD_API_MATERIALS = '0';
		process.env.DASHBOARD_API_DATA = '0';
		const spec = filterOpenApiSpec();
		expect(spec.paths['/api/public/guilds']).toBeDefined();
		expect(spec.tags).toEqual([{ name: 'Guilds' }]);
		expect(spec.info.description).toContain('#### `guilds`');
		existsSpy.mockRestore();
		statSpy.mockRestore();
		readSpy.mockRestore();
		resetSpecCacheForTests();
	});

	it('loadBaseSpec throws when spec file missing', () => {
		const existsSpy = jest.spyOn(fs, 'existsSync').mockReturnValue(false);
		expect(() => loadBaseSpec()).toThrow(/OpenAPI spec missing/);
		existsSpy.mockRestore();
	});

	it('filterOpenApiSpec ignore scopes inconnus et spec sans tags', () => {
		jest.isolateModules(() => {
			jest.doMock('../../../.dashboard/lib/api/tokens', () => ({
				...jest.requireActual('../../../.dashboard/lib/api/tokens'),
				enabledScopes: () => ['phantom', 'materials'],
			}));
			const isolated = require('../../../.dashboard/lib/api/openapi');
			isolated.resetSpecCacheForTests();
			const existsSpy = jest.spyOn(fs, 'existsSync').mockReturnValue(true);
			const statSpy = jest.spyOn(fs, 'statSync').mockReturnValue({ mtimeMs: 1002 });
			const readSpy = jest.spyOn(fs, 'readFileSync').mockReturnValue(JSON.stringify({
				paths: { '/api/public/materials/categories': { get: {} } },
				info: { title: 'FoxBot' },
			}));
			const spec = isolated.filterOpenApiSpec();
			expect(spec.paths).toEqual({
				'/api/public/materials/categories': { get: {} },
			});
			expect(spec.tags).toEqual([]);
			existsSpy.mockRestore();
			statSpy.mockRestore();
			readSpy.mockRestore();
			isolated.resetSpecCacheForTests();
		});
	});
});
