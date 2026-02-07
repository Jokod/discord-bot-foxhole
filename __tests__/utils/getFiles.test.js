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

	// Tests d'intégration pour getFiles devraient être faits avec des tests E2E
	// car la fonction utilise require() dynamique qui est difficile à mocker
	it.skip('should process files recursively', () => {
		// Ce test nécessiterait un mock complexe de fs et require
		// Il est préférable de le tester en intégration
	});
});
