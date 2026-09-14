'use strict';

const {
	WikiSyncError,
	WikiApiError,
	WikiCategoryApiError,
	WikiImageApiError,
	WikiRateLimitError,
	WikiAbortedError,
	assertNotAborted,
} = require('../../../scripts/lib/wiki-sync/wiki/errors');

describe('wiki-sync / errors', () => {
	it('WikiSyncError porte code et name', () => {
		const err = new WikiSyncError('msg', { code: 'x' });
		expect(err).toBeInstanceOf(Error);
		expect(err.name).toBe('WikiSyncError');
		expect(err.code).toBe('x');
	});

	it('WikiSyncError sans options laisse code undefined', () => {
		const err = new WikiSyncError('seul');
		expect(err.message).toBe('seul');
		expect(err.code).toBeUndefined();
	});

	it('WikiSyncError sans code explicite', () => {
		const err = new WikiSyncError('msg');
		expect(err.code).toBeUndefined();
	});

	it('WikiApiError formate le message API', () => {
		const err = new WikiApiError('bad', 'fail');
		expect(err.name).toBe('WikiApiError');
		expect(err.message).toContain('API: bad');
	});

	it('WikiCategoryApiError formate categorymembers', () => {
		const err = new WikiCategoryApiError('cm', 'bad cat');
		expect(err.name).toBe('WikiCategoryApiError');
		expect(err.message).toContain('categorymembers');
	});

	it('WikiImageApiError formate imageinfo', () => {
		const err = new WikiImageApiError('img', 'bad image');
		expect(err.name).toBe('WikiImageApiError');
		expect(err.message).toContain('imageinfo');
	});

	it('WikiRateLimitError message et code par défaut', () => {
		const err = new WikiRateLimitError();
		expect(err.name).toBe('WikiRateLimitError');
		expect(err.code).toBe('rate_limit');
		expect(err.message).toContain('Max wiki requests');
	});

	it('WikiRateLimitError accepte un message personnalisé', () => {
		const err = new WikiRateLimitError('quota dépassé');
		expect(err.message).toBe('quota dépassé');
	});

	it('WikiAbortedError et assertNotAborted', () => {
		const err = new WikiAbortedError();
		expect(err.name).toBe('WikiAbortedError');
		expect(err.code).toBe('WIKI_SYNC_ABORTED');
		expect(() => assertNotAborted()).not.toThrow();
		expect(() => assertNotAborted(() => false)).not.toThrow();
		expect(() => assertNotAborted(() => true)).toThrow(WikiAbortedError);
	});
});
