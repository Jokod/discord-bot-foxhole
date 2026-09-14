'use strict';

const { PageCache } = require('../../../scripts/lib/wiki-sync/wiki/cache');

describe('wiki-sync / wiki-cache', () => {
	it('stocke et récupère le wikitext par titre', () => {
		const cache = new PageCache();
		expect(cache.has('A')).toBe(false);
		expect(cache.get('A')).toBeUndefined();

		cache.set('A', 'body');
		expect(cache.has('A')).toBe(true);
		expect(cache.get('A')).toBe('body');
	});

	it('setMany et missingTitles', () => {
		const cache = new PageCache();
		cache.setMany([
			['A', 'one'],
			['B', null],
		]);
		expect(cache.get('B')).toBeNull();
		expect(cache.missingTitles(['A', 'B', 'C'])).toEqual(['C']);
	});
});
