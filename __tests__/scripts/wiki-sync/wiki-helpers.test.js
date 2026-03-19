'use strict';

const {
	isFrenchUniformEntry,
	inferWikiTitle,
	wikiFactionToArray,
	canonicalInfoboxNameForCatalog,
	asciiQuotesToCurly,
} = require('../../../scripts/lib/wiki-sync/wiki-helpers');

describe('wiki-sync / wiki-helpers', () => {
	describe('isFrenchUniformEntry', () => {
		it('détecte le préfixe Uniforme ', () => {
			expect(isFrenchUniformEntry({ itemName: 'Uniforme de soldat' })).toBe(true);
		});
		it('rejette les autres noms', () => {
			expect(isFrenchUniformEntry({ itemName: 'Rifle' })).toBe(false);
		});
	});

	describe('inferWikiTitle', () => {
		it('applique WIKI_TITLE_OVERRIDES (ex. Gast)', () => {
			expect(inferWikiTitle('KRN886-127 Gast')).toBe('KRN886-127 Gast Machine Gun');
		});
		it('mappe Malone Ratcatcher', () => {
			expect(inferWikiTitle('Malone Ratcatcher')).toBe('Malone Ratcatcher MK.1');
		});
		it('mappe The Osprey', () => {
			expect(inferWikiTitle('The Osprey')).toBe('The Ospreay');
		});
		it('retire le suffixe Ammo Crate', () => {
			expect(inferWikiTitle('9mm Ammo Crate')).toBe('9mm');
		});
		it('mappe les obus « mm Shell » vers le calibre', () => {
			expect(inferWikiTitle('120mm Shell')).toBe('120mm');
			expect(inferWikiTitle('14.5mm Shell')).toBe('14.5mm');
		});
		it('mappe Obus Fury FR', () => {
			expect(inferWikiTitle('Obus « Fury » de 250 mm')).toBe('250mm \u201cFury\u201d Shell');
		});
		it('normalise Mk. → MK. pour le wiki', () => {
			expect(inferWikiTitle('Bonesaw Mk.3')).toBe('Bonesaw MK.3');
		});
		it('mappe 90T-v Nemesis vers le titre wiki avec guillemets', () => {
			expect(inferWikiTitle('90T-v Nemesis')).toBe('90T-v \u201cNemesis\u201d');
		});
		it('Molten Wind v.II → titre page avec guillemets wiki', () => {
			expect(inferWikiTitle('Molten Wind v.II Flame Torch')).toBe('\u201cMolten Wind\u201d v.II Flame Torch');
		});
	});

	describe('wikiFactionToArray', () => {
		it('both / all → les deux factions', () => {
			expect(wikiFactionToArray('Both')).toEqual(['colonial', 'warden']);
			expect(wikiFactionToArray('all')).toEqual(['colonial', 'warden']);
		});
		it('col / colonial', () => {
			expect(wikiFactionToArray('Col')).toEqual(['colonial']);
			expect(wikiFactionToArray('colonial')).toEqual(['colonial']);
		});
		it('war / warden', () => {
			expect(wikiFactionToArray('War')).toEqual(['warden']);
			expect(wikiFactionToArray('warden')).toEqual(['warden']);
		});
		it('valeur inconnue → null', () => {
			expect(wikiFactionToArray('unknown')).toBeNull();
			expect(wikiFactionToArray('')).toBeNull();
		});
	});

	describe('canonicalInfoboxNameForCatalog', () => {
		it('normalise AP/RPG et ARC/RPG vers le slash Unicode wiki', () => {
			expect(canonicalInfoboxNameForCatalog('AP/RPG')).toBe('AP\u29F8RPG');
			expect(canonicalInfoboxNameForCatalog('ARC/RPG')).toBe('ARC\u29F8RPG');
		});
		it('laisse les autres noms inchangés', () => {
			expect(canonicalInfoboxNameForCatalog('RPG')).toBe('RPG');
			expect(canonicalInfoboxNameForCatalog('  trim  ')).toBe('trim');
		});
	});

	describe('asciiQuotesToCurly', () => {
		it('alterne ouverture / fermeture', () => {
			expect(asciiQuotesToCurly('a "b" c')).toBe('a \u201cb\u201d c');
		});
	});
});
