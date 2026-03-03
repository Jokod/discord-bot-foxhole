const fs = require('fs');
const path = require('path');

describe('getFiles utility', () => {
	// Note: getFiles est difficile à tester unitairement car il utilise require() dynamiquement
	// avec des chemins relatifs qui ne fonctionnent pas bien avec Jest.
	// Ces tests vérifient uniquement la structure du module.

	it('should be a function', () => {
		const getFiles = require('../../utils/getFiles');
		expect(typeof getFiles).toBe('function');
	});

	it('should be exported as a module', () => {
		const getFiles = require('../../utils/getFiles');
		expect(getFiles).toBeDefined();
	});

	it('should process files recursively', () => {
		const getFiles = require('../../utils/getFiles');
		const collected = [];
		getFiles('./__tests__/fixtures/getFilesTest', (mod, filePath) => {
			collected.push({ mod, filePath });
		});
		expect(collected.length).toBe(2);
		expect(collected.some((c) => c.mod.name === 'a')).toBe(true);
		expect(collected.some((c) => c.mod.name === 'b')).toBe(true);
		expect(collected.some((c) => c.filePath.includes('a.js'))).toBe(true);
		expect(collected.some((c) => c.filePath.includes('subdir' + path.sep + 'b.js'))).toBe(true);
	});
});
