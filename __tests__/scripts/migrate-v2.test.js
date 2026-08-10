'use strict';

const {
	VALID_TRACKED_TYPES_PREFIXES,
	OBSOLETE_SLASH_COMMANDS,
	isLegacyMaterial,
	isValidTrackedType,
} = require('../../scripts/lib/migrate-v2/constants.js');

describe('migrate-v2 helpers', () => {
	describe('isLegacyMaterial', () => {
		it('marque tout materials collection comme legacy après pivot order', () => {
			expect(isLegacyMaterial({})).toBe(true);
			expect(isLegacyMaterial({ stock_id: 'abc', stock: 5, target: 10 })).toBe(true);
		});
	});

	describe('isValidTrackedType', () => {
		it('accepte stockpile_list et order_board', () => {
			expect(isValidTrackedType('stockpile_list')).toBe(true);
			expect(isValidTrackedType('order_board:board1')).toBe(true);
		});

		it('rejette inventaire stock_* et types obsolètes', () => {
			expect(isValidTrackedType('stock_summary:board1')).toBe(false);
			expect(isValidTrackedType('stock_panel:board1')).toBe(false);
			expect(isValidTrackedType('material_list')).toBe(false);
			expect(isValidTrackedType('')).toBe(false);
			expect(isValidTrackedType(null)).toBe(false);
		});
	});

	describe('constants', () => {
		it('expose la whitelist et les commandes obsolètes', () => {
			expect(VALID_TRACKED_TYPES_PREFIXES).toEqual([
				'stockpile_list',
				'order_board:',
			]);
			expect(OBSOLETE_SLASH_COMMANDS).toContain('stock');
			expect(OBSOLETE_SLASH_COMMANDS).toContain('logistics');
		});
	});
});
