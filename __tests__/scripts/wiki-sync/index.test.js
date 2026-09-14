'use strict';

describe('wiki-sync / index', () => {
	it('réexporte les API publiques du module', () => {
		const wikiSync = require('../../../scripts/lib/wiki-sync');
		expect(typeof wikiSync.parseWikiSyncArgs).toBe('function');
		expect(typeof wikiSync.runCli).toBe('function');
		expect(typeof wikiSync.runWikiSync).toBe('function');
		expect(typeof wikiSync.PageCache).toBe('function');
		expect(typeof wikiSync.RateLimiter).toBe('function');
		expect(wikiSync.WIKI_API).toBeTruthy();
		expect(wikiSync.RESOURCE_NAME_TO_REL).toBeTruthy();
	});
});
