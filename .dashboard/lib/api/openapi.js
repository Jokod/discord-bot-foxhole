'use strict';

const fs = require('fs');
const path = require('path');
const { enabledScopes, isDocsEnabled } = require('./tokens');

const SPEC_PATH = path.join(__dirname, '..', '..', 'docs', 'openapi.json');

let cachedBaseSpec = null;
let cachedSpecMtimeMs = 0;

const SCOPE_PATHS = {
	materials: [
		'/api/public/materials/categories',
		'/api/public/materials/items',
	],
	data: ['/api/public/data'],
	guilds: ['/api/public/guilds'],
};

const SCOPE_SUMMARIES = {
	materials: 'Materials catalogue: categories and items (`limit`, `offset`; items also accept `category`, `subcategory`).',
	data: 'Aggregated KPIs, command usage, war status (no PII).',
	guilds: 'Active Discord servers. **Sensitive:** guild IDs are exposed.',
};

function loadBaseSpec() {
	if (!fs.existsSync(SPEC_PATH)) {
		throw new Error(`OpenAPI spec missing: ${SPEC_PATH}`);
	}
	const mtimeMs = fs.statSync(SPEC_PATH).mtimeMs;
	if (cachedBaseSpec && mtimeMs === cachedSpecMtimeMs) {
		return cachedBaseSpec;
	}
	cachedBaseSpec = JSON.parse(fs.readFileSync(SPEC_PATH, 'utf8'));
	cachedSpecMtimeMs = mtimeMs;
	return cachedBaseSpec;
}

function resetSpecCacheForTests() {
	cachedBaseSpec = null;
	cachedSpecMtimeMs = 0;
}

function allScopedPaths() {
	return [...new Set(Object.values(SCOPE_PATHS).flat())];
}

function assertSpecMatchesScopeRoutes(spec = loadBaseSpec()) {
	const missing = allScopedPaths().filter((pathKey) => !spec.paths?.[pathKey]);
	if (missing.length) {
		throw new Error(`OpenAPI spec missing paths: ${missing.join(', ')}`);
	}
}

function buildInfoDescription(scopes) {
	const lines = [
		'Read-only JWT API for FoxBot dashboard data.',
		'',
		'### Quick start',
		'',
		'1. Enable `DASHBOARD_API=1` and configure `DASHBOARD_API_JWT_SECRET` on the server',
		'2. Create a token in **Settings → API** (one token per app or integration)',
		'3. Authorize every request:',
		'',
		'```http',
		'Authorization: Bearer <your_token>',
		'```',
		'',
		'### Pagination',
		'',
		'Materials routes accept `limit` (default **50**, max **200**) and `offset`.',
		'`/items` also accepts optional `category` and `subcategory` query filters.',
		'',
		'### Active scopes on this server',
		'',
	];

	if (!scopes.length) {
		lines.push('_No scopes enabled on this instance._');
	}
	else {
		for (const scope of scopes) {
			lines.push(`#### \`${scope}\``);
			if (SCOPE_SUMMARIES[scope]) lines.push('', SCOPE_SUMMARIES[scope], '');
			for (const route of SCOPE_PATHS[scope] || []) {
				lines.push(`- \`GET ${route}\``);
			}
			lines.push('');
		}
	}

	return lines.join('\n').trim();
}

function filterOpenApiSpec(env = process.env) {
	const base = loadBaseSpec();
	const scopes = enabledScopes(env);
	const filtered = JSON.parse(JSON.stringify(base));

	filtered.paths = {};
	for (const scope of scopes) {
		for (const p of SCOPE_PATHS[scope] || []) {
			if (base.paths[p]) {
				filtered.paths[p] = base.paths[p];
			}
		}
	}

	const tagNames = scopes.map((s) => s.charAt(0).toUpperCase() + s.slice(1));
	filtered.tags = (base.tags || []).filter((tag) => tagNames.includes(tag.name));

	filtered.info = {
		...base.info,
		description: buildInfoDescription(scopes),
	};

	return filtered;
}

function isOpenApiRouteEnabled(env = process.env) {
	return isDocsEnabled(env);
}

module.exports = {
	SPEC_PATH,
	SCOPE_PATHS,
	assertSpecMatchesScopeRoutes,
	allScopedPaths,
	loadBaseSpec,
	buildInfoDescription,
	filterOpenApiSpec,
	isOpenApiRouteEnabled,
	resetSpecCacheForTests,
};
