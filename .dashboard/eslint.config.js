const js = require('@eslint/js');

const nodeGlobals = {
	process: 'readonly',
	require: 'readonly',
	module: 'readonly',
	__dirname: 'readonly',
	__filename: 'readonly',
	Buffer: 'readonly',
	console: 'readonly',
	setTimeout: 'readonly',
	setInterval: 'readonly',
	clearTimeout: 'readonly',
	clearInterval: 'readonly',
	fetch: 'readonly',
	URL: 'readonly',
	URLSearchParams: 'readonly',
	AbortController: 'readonly',
};

const browserGlobals = {
	window: 'readonly',
	document: 'readonly',
	navigator: 'readonly',
	localStorage: 'readonly',
	SwaggerUIBundle: 'readonly',
	setInterval: 'readonly',
	clearInterval: 'readonly',
	setTimeout: 'readonly',
	clearTimeout: 'readonly',
	fetch: 'readonly',
};

/** Node / API lint (always available). Vue/TS web lint: `eslint.web.config.js`. */
module.exports = [
	{
		ignores: ['dist/**', 'node_modules/**', 'var/**', 'web/**'],
	},
	js.configs.recommended,
	{
		files: ['**/*.js'],
		languageOptions: {
			ecmaVersion: 2022,
			sourceType: 'commonjs',
			globals: nodeGlobals,
		},
	},
	{
		files: ['web/public/**/*.js'],
		languageOptions: {
			ecmaVersion: 2022,
			sourceType: 'script',
			globals: browserGlobals,
		},
	},
];
