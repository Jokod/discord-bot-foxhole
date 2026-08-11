'use strict';

jest.mock('../../../scripts/lib/wiki-sync/wiki-helpers', () => ({
	sleep: jest.fn().mockResolvedValue(undefined),
}));

const {
	fetchCategoryPageTitles,
	fetchWikitextForTitles,
} = require('../../../scripts/lib/wiki-sync/wiki-client');

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

	it('fetchWikitextForTitles suit normalized titles dans la query', async () => {
		global.fetch = jest.fn().mockResolvedValue({
			json: async () => ({
				query: {
					pages: {
						'3': {
							title: 'Canonical Title',
							revisions: [{ slots: { main: { '*': 'normalized body' } } }],
						},
					},
					normalized: [{ from: 'weird title', to: 'Canonical Title' }],
					redirects: [],
				},
			}),
		});

		const map = await fetchWikitextForTitles(['weird title']);
		expect(map.get('weird title')).toBe('normalized body');
	});

	it('fetchWikitextForTitles propage erreur API', async () => {
		global.fetch = jest.fn().mockResolvedValue({
			json: async () => ({
				error: { code: 'bad', info: 'fail' },
			}),
		});

		await expect(fetchWikitextForTitles(['X'])).rejects.toThrow(/API:/);
	});

	it('fetchCategoryPageTitles agrège ns===0 et ignore les autres ns', async () => {
		global.fetch = jest.fn().mockResolvedValue({
			json: async () => ({
				query: {
					categorymembers: [
						{ title: 'Page A', ns: 0 },
						{ title: 'Talk:Page A', ns: 1 },
						{ title: 'Page B', ns: 0 },
					],
				},
			}),
		});

		const titles = await fetchCategoryPageTitles('Category:Test');
		expect(global.fetch).toHaveBeenCalledTimes(1);
		expect(titles).toEqual(new Set(['Page A', 'Page B']));
	});

	it('fetchCategoryPageTitles pagine avec cmcontinue', async () => {
		global.fetch = jest.fn()
			.mockResolvedValueOnce({
				json: async () => ({
					query: {
						categorymembers: [{ title: 'Page 1', ns: 0 }],
					},
					continue: { cmcontinue: 'abc|def' },
				}),
			})
			.mockResolvedValueOnce({
				json: async () => ({
					query: {
						categorymembers: [{ title: 'Page 2', ns: 0 }],
					},
				}),
			});

		const titles = await fetchCategoryPageTitles('Category:Test');
		expect(global.fetch).toHaveBeenCalledTimes(2);
		expect(titles).toEqual(new Set(['Page 1', 'Page 2']));
		const secondUrl = new URL(global.fetch.mock.calls[1][0]);
		expect(secondUrl.searchParams.get('cmcontinue')).toBe('abc|def');
	});

	it('fetchCategoryPageTitles propage erreur API', async () => {
		global.fetch = jest.fn().mockResolvedValue({
			json: async () => ({
				error: { code: 'cmerror', info: 'bad category' },
			}),
		});

		await expect(fetchCategoryPageTitles('Category:Bad')).rejects.toThrow(/API categorymembers:/);
	});

	it('fetchWikitextForTitles gère page invalid et contenu absent', async () => {
		global.fetch = jest.fn().mockResolvedValue({
			json: async () => ({
				query: {
					pages: {
						'-2': { title: 'Bad', invalid: true },
						'3': {
							title: 'Empty',
							revisions: [{ slots: { main: {} } }],
						},
					},
					normalized: [],
					redirects: [],
				},
			}),
		});

		const map = await fetchWikitextForTitles(['Bad', 'Empty']);
		expect(map.get('Bad')).toBeNull();
		expect(map.get('Empty')).toBeNull();
	});

	it('fetchWikitextForTitles enchaîne normalized puis redirect', async () => {
		global.fetch = jest.fn().mockResolvedValue({
			json: async () => ({
				query: {
					pages: {
						'4': {
							title: 'Final',
							revisions: [{ slots: { main: { '*': 'final-body' } } }],
						},
					},
					normalized: [{ from: 'Alias', to: 'Mid Title' }],
					redirects: [{ from: 'Mid Title', to: 'Final' }],
				},
			}),
		});

		const map = await fetchWikitextForTitles(['Alias']);
		expect(map.get('Alias')).toBe('final-body');
	});

	it('fetchWikitextForTitles ignore normalized/redirect non correspondants', async () => {
		global.fetch = jest.fn().mockResolvedValue({
			json: async () => ({
				query: {
					pages: {
						'5': {
							title: 'Hit',
							revisions: [{ slots: { main: { '*': 'hit-body' } } }],
						},
					},
					normalized: [{ from: 'Other', to: 'Miss' }, { from: 'Wanted', to: 'Hit' }],
					redirects: [{ from: 'Else', to: 'Nope' }],
				},
			}),
		});

		const map = await fetchWikitextForTitles(['Wanted']);
		expect(map.get('Wanted')).toBe('hit-body');
	});

	it('fetchWikitextForTitles gère réponse sans query', async () => {
		global.fetch = jest.fn().mockResolvedValue({
			json: async () => ({}),
		});

		const map = await fetchWikitextForTitles(['Any']);
		expect(map.get('Any')).toBeNull();
	});

	it('fetchCategoryPageTitles gère réponse sans query.categorymembers', async () => {
		global.fetch = jest.fn().mockResolvedValue({
			json: async () => ({}),
		});

		const titles = await fetchCategoryPageTitles('Category:Empty');
		expect(titles).toEqual(new Set());
	});
});
