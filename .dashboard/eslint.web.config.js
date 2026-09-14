const js = require('@eslint/js');
const vue = require('eslint-plugin-vue');
const tseslint = require('typescript-eslint');

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

const webTsFiles = ['web/**/*.ts', 'web/**/*.tsx'];
const webVueFiles = ['web/**/*.vue'];
const webAppFiles = [...webTsFiles, ...webVueFiles];

/** Vue/TS frontend lint — requires `npm install` in `.dashboard/`. */
module.exports = [
	{
		ignores: ['dist/**', 'node_modules/**', 'var/**'],
	},
	js.configs.recommended,
	...tseslint.configs.recommended.map((config) => ({
		...config,
		files: webTsFiles,
	})),
	...vue.configs['flat/essential'].map((config) => ({
		...config,
		files: webVueFiles,
	})),
	{
		files: webAppFiles,
		languageOptions: {
			globals: browserGlobals,
		},
		rules: {
			// TypeScript resolves globals; avoids false positives on DOM types in generics (e.g. ref<HTMLElement>).
			'no-undef': 'off',
		},
	},
	{
		files: webVueFiles,
		languageOptions: {
			parserOptions: {
				parser: tseslint.parser,
			},
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
