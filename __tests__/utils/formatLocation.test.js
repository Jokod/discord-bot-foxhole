const { normalizeForDb, formatForDisplay } = require('../../utils/formatLocation.js');

describe('formatLocation utility', () => {
	describe('normalizeForDb', () => {
		it('retourne une chaîne vide pour valeur null/undefined', () => {
			expect(normalizeForDb(null)).toBe('');
			expect(normalizeForDb(undefined)).toBe('');
		});

		it('retourne une chaîne vide pour non-string', () => {
			expect(normalizeForDb(123)).toBe('');
			expect(normalizeForDb({})).toBe('');
		});

		it('trim et title case la chaîne', () => {
			expect(normalizeForDb('  the salt farms  ')).toBe('The Salt Farms');
		});

		it('remplace les tirets par des espaces', () => {
			expect(normalizeForDb('the-salt-farms')).toBe('The Salt Farms');
		});

		it('gère les mots multiples', () => {
			expect(normalizeForDb('deadlands hex')).toBe('Deadlands Hex');
		});
	});

	describe('formatForDisplay', () => {
		it('retourne une chaîne vide pour valeur vide', () => {
			expect(formatForDisplay('')).toBe('');
			expect(formatForDisplay(null)).toBe('');
		});

		it('délègue à normalizeForDb', () => {
			expect(formatForDisplay('the salt farms')).toBe('The Salt Farms');
		});
	});
});
