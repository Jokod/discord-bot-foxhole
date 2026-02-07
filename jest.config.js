module.exports = {
	testEnvironment: 'node',
	coverageDirectory: 'coverage',
	collectCoverageFrom: [
		'utils/**/*.js',
		'interactions/**/*.js',
		'commands/**/*.js',
		'events/**/*.js',
		'data/models/**/*.js',
		'!**/node_modules/**',
		'!**/coverage/**',
		'!**/__tests__/**',
	],
	testMatch: [
		'**/__tests__/**/*.test.js',
		'**/?(*.)+(spec|test).js',
	],
	// Désactivé temporairement - à activer progressivement lors de l'ajout de tests
	// coverageThreshold: {
	// 	global: {
	// 		branches: 10,
	// 		functions: 10,
	// 		lines: 10,
	// 		statements: 10,
	// 	},
	// },
	setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
	verbose: true,
};
