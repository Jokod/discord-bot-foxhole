'use strict';

const { fetchWikitextForTitles } = require('../../../scripts/lib/wiki-sync/wiki-client');

describe('wiki-sync / wiki-client', () => {
	const originalFetch = global.fetch;

	afterEach(() => {
		global.fetch = originalFetch;
	});

	it('fetchWikitextForTitles mappe le titre demandé au contenu de la page résolue', async () => {
		const wikitext = '{{Item Infobox\n| name = X\n| faction = Both\n}}\n';
		global.fetch = jest.fn().mockResolvedValue({
			json: async () => ({
				query: {
					pages: {
						'1': {
							title: 'Requested Title',
							revisions: [{ slots: { main: { '*': wikitext } } }],
						},
					},
					normalized: [],
					redirects: [],
				},
			}),
		});

		const map = await fetchWikitextForTitles(['Requested Title']);
		expect(global.fetch).toHaveBeenCalledTimes(1);
		expect(map.get('Requested Title')).toBe(wikitext);
	});

	it('fetchWikitextForTitles retourne null pour page manquante', async () => {
		global.fetch = jest.fn().mockResolvedValue({
			json: async () => ({
				query: {
					pages: {
						'-1': { title: 'Missing', missing: true },
					},
					normalized: [],
					redirects: [],
				},
			}),
		});

		const map = await fetchWikitextForTitles(['Nope']);
		expect(map.get('Nope')).toBeNull();
	});

	it('fetchWikitextForTitles suit redirects dans la query', async () => {
		global.fetch = jest.fn().mockResolvedValue({
			json: async () => ({
				query: {
					pages: {
						'2': {
							title: 'Real Page',
							revisions: [{ slots: { main: { '*': 'body' } } }],
						},
					},
					normalized: [],
					redirects: [{ from: 'Alias', to: 'Real Page' }],
				},
			}),
		});

		const map = await fetchWikitextForTitles(['Alias']);
		expect(map.get('Alias')).toBe('body');
	});

	it('fetchWikitextForTitles propage erreur API', async () => {
		global.fetch = jest.fn().mockResolvedValue({
			json: async () => ({
				error: { code: 'bad', info: 'fail' },
			}),
		});

		await expect(fetchWikitextForTitles(['X'])).rejects.toThrow(/API:/);
	});
});
