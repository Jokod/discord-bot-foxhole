'use strict';

const { isValidOperationTitle, isValidOperationDescription } = require('../../utils/operation-text.js');

describe('isValidOperationTitle', () => {
	it('accepte lettres accentuées et symboles autorisés', () => {
		expect(isValidOperationTitle('DÉFENSE')).toBe(true);
		expect(isValidOperationTitle('RAID !')).toBe(true);
		expect(isValidOperationTitle('OP#1')).toBe(true);
	});

	it('refuse caractères interdits ou longueur invalide', () => {
		expect(isValidOperationTitle('BAD$$$')).toBe(false);
		expect(isValidOperationTitle('titrelongxx')).toBe(false);
		expect(isValidOperationTitle('')).toBe(false);
	});
});

describe('isValidOperationDescription', () => {
	it('accepte lettres accentuées et ponctuation courante', () => {
		expect(isValidOperationDescription('Opération sur le front nord.')).toBe(true);
		expect(isValidOperationDescription('Rendez-vous à 20h (hex sud) : push !')).toBe(false);
		expect(isValidOperationDescription('Rendez-vous à 20h (hex sud) : push')).toBe(true);
		expect(isValidOperationDescription('¿Dónde? / norte')).toBe(true);
		expect(isValidOperationDescription('L\'équipe dit "go"')).toBe(true);
	});

	it('refuse caractères markdown, mentions et symboles risqués', () => {
		expect(isValidOperationDescription('bad$$$')).toBe(false);
		expect(isValidOperationDescription('*bold*')).toBe(false);
		expect(isValidOperationDescription('<@123456789>')).toBe(false);
		expect(isValidOperationDescription('@everyone')).toBe(false);
		expect(isValidOperationDescription('salut @here')).toBe(false);
		expect(isValidOperationDescription('lien https://example.com')).toBe(true);
		expect(isValidOperationDescription('emoji 🦊')).toBe(false);
	});

	it('refuse chaînes vides ou trop longues', () => {
		expect(isValidOperationDescription('')).toBe(false);
		expect(isValidOperationDescription('a'.repeat(1001))).toBe(false);
	});
});
