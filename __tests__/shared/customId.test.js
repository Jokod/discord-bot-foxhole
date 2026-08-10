'use strict';

const { encode, decode, getPrefix, SEP, LEGACY_SEP } = require('../../shared/customId.js');

describe('shared/customId', () => {
	describe('encode', () => {
		it('joint le préfixe et les parties avec |', () => {
			expect(encode('stock', 'cat', 'item')).toBe(`stock${SEP}cat${SEP}item`);
		});

		it('retire les | des parties', () => {
			expect(encode('p', 'a|b', 'c')).toBe(`p${SEP}ab${SEP}c`);
		});
	});

	describe('decode', () => {
		it('parse le format pipe', () => {
			expect(decode('stock|board1|mat2')).toEqual({
				prefix: 'stock',
				parts: ['board1', 'mat2'],
			});
		});

		it('parse le format legacy tiret', () => {
			expect(decode(`stockpile_reset${LEGACY_SEP}abc123`)).toEqual({
				prefix: 'stockpile_reset',
				parts: ['abc123'],
			});
		});

		it('retourne null pour entrée invalide', () => {
			expect(decode(null)).toBeNull();
			expect(decode('')).toBeNull();
		});

		it('retourne le customId entier comme préfixe sans séparateur', () => {
			expect(decode('stockpile_cleanup')).toEqual({
				prefix: 'stockpile_cleanup',
				parts: [],
			});
		});
	});

	describe('getPrefix', () => {
		it('extrait le préfixe pipe ou tiret', () => {
			expect(getPrefix('stock|a|b')).toBe('stock');
			expect(getPrefix('stockpile_reset-oid')).toBe('stockpile_reset');
			expect(getPrefix('stockpile_cleanup')).toBe('stockpile_cleanup');
		});

		it('retourne chaîne vide pour entrée vide', () => {
			expect(getPrefix('')).toBe('');
			expect(getPrefix(null)).toBe('');
		});
	});
});
