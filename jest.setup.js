// Configuration globale pour Jest
// Charge les variables d'environnement pour les tests
require('dotenv').config({ path: '.env.test' });

// Mock console pour les tests (optionnel)
global.console = {
	...console,
	error: jest.fn(),
	warn: jest.fn(),
	log: jest.fn(),
};
