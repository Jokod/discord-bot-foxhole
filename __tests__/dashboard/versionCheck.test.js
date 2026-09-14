'use strict';

const {
	getLocalVersion,
	normalizeVersion,
	parseGithubRepo,
	compareSemver,
	getVersionStatus,
	resetVersionCacheForTests,
	CACHE_TTL_MS,
} = require('../../.dashboard/lib/versionCheck');

describe('versionCheck', () => {
	beforeEach(() => {
		resetVersionCacheForTests();
	});

	it('getLocalVersion et normalizeVersion', () => {
		expect(getLocalVersion({ version: '1.2.3' })).toBe('1.2.3');
		expect(getLocalVersion({})).toBe('');
		expect(getLocalVersion()).toMatch(/^\d+\.\d+\.\d+/);
		expect(normalizeVersion('v1.0.7')).toBe('1.0.7');
		expect(normalizeVersion(' 1.0.7 ')).toBe('1.0.7');
		expect(normalizeVersion('')).toBe('');
		expect(compareSemver('1.x.0', '1.0.0')).toBe(0);
	});

	it('parseGithubRepo', () => {
		expect(parseGithubRepo('https://github.com/Jokod/discord-bot-foxhole')).toEqual({
			owner: 'Jokod',
			repo: 'discord-bot-foxhole',
		});
		expect(parseGithubRepo('https://www.github.com/Jokod/discord-bot-foxhole.git')).toEqual({
			owner: 'Jokod',
			repo: 'discord-bot-foxhole',
		});
		expect(parseGithubRepo('https://gitlab.com/x/y')).toBeNull();
		expect(parseGithubRepo('not-a-url')).toBeNull();
		expect(parseGithubRepo('')).toBeNull();
		expect(parseGithubRepo('https://github.com/only')).toBeNull();
	});

	it('compareSemver', () => {
		expect(compareSemver('1.0.8', '1.0.7')).toBe(1);
		expect(compareSemver('1.0.7', '1.0.8')).toBe(-1);
		expect(compareSemver('v1.0.7', '1.0.7')).toBe(0);
		expect(compareSemver('2.0.0', '1.9.9')).toBe(1);
		expect(compareSemver('1.0', '1.0.0')).toBe(0);
	});

	it('getVersionStatus sans github / fetch', async () => {
		await expect(getVersionStatus({
			pkg: { version: '1.0.7' },
			githubUrl: '',
		})).resolves.toEqual({
			local: '1.0.7',
			latest: null,
			updateAvailable: false,
			releaseUrl: null,
		});

		await expect(getVersionStatus({
			pkg: { version: '' },
			githubUrl: 'https://github.com/a/b',
		})).resolves.toMatchObject({ updateAvailable: false, local: '' });

		await expect(getVersionStatus({
			pkg: { version: '1.0.0' },
			githubUrl: 'https://github.com/a/b',
			fetchFn: null,
		})).resolves.toMatchObject({ updateAvailable: false });
	});

	it('getVersionStatus update disponible + cache', async () => {
		const fetchFn = jest.fn().mockResolvedValue({
			ok: true,
			json: async () => ({
				tag_name: 'v1.0.8',
				html_url: 'https://github.com/Jokod/discord-bot-foxhole/releases/tag/1.0.8',
			}),
		});
		const now = jest.fn()
			.mockReturnValueOnce(1_000)
			.mockReturnValueOnce(1_000 + 10)
			.mockReturnValueOnce(1_000 + CACHE_TTL_MS + 1);

		const first = await getVersionStatus({
			pkg: { version: '1.0.7' },
			githubUrl: 'https://github.com/Jokod/discord-bot-foxhole',
			fetchFn,
			now,
		});
		expect(first).toEqual({
			local: '1.0.7',
			latest: '1.0.8',
			updateAvailable: true,
			releaseUrl: 'https://github.com/Jokod/discord-bot-foxhole/releases/tag/1.0.8',
		});
		expect(fetchFn).toHaveBeenCalledTimes(1);

		const cached = await getVersionStatus({
			pkg: { version: '1.0.7' },
			githubUrl: 'https://github.com/Jokod/discord-bot-foxhole',
			fetchFn,
			now,
		});
		expect(cached.updateAvailable).toBe(true);
		expect(fetchFn).toHaveBeenCalledTimes(1);

		fetchFn.mockResolvedValueOnce({
			ok: true,
			json: async () => ({ tag_name: '1.0.7', html_url: '' }),
		});
		const refreshed = await getVersionStatus({
			pkg: { version: '1.0.7' },
			githubUrl: 'https://github.com/Jokod/discord-bot-foxhole',
			fetchFn,
			now,
		});
		expect(refreshed.updateAvailable).toBe(false);
		expect(refreshed.releaseUrl).toContain('/releases/tag/1.0.7');
		expect(fetchFn).toHaveBeenCalledTimes(2);
	});

	it('getVersionStatus() sans args utilise les défauts', async () => {
		const prev = process.env.GITHUB_URL;
		delete process.env.GITHUB_URL;
		try {
			const status = await getVersionStatus();
			expect(status).toMatchObject({ updateAvailable: false });
			expect(status.local).toBeTruthy();
		}
		finally {
			if (prev === undefined) delete process.env.GITHUB_URL;
			else process.env.GITHUB_URL = prev;
		}
	});

	it('getVersionStatus utilise env et fetch globaux par défaut', async () => {
		const prev = process.env.GITHUB_URL;
		process.env.GITHUB_URL = 'https://github.com/Jokod/discord-bot-foxhole';
		const fetchFn = jest.fn().mockResolvedValue({
			ok: true,
			json: async () => ({ tag_name: '9.9.9', html_url: 'https://example.com/r' }),
		});
		const prevFetch = globalThis.fetch;
		globalThis.fetch = fetchFn;
		try {
			const status = await getVersionStatus({ pkg: { version: '1.0.0' } });
			expect(status.updateAvailable).toBe(true);
			expect(status.latest).toBe('9.9.9');
			expect(fetchFn).toHaveBeenCalled();
		}
		finally {
			globalThis.fetch = prevFetch;
			if (prev === undefined) delete process.env.GITHUB_URL;
			else process.env.GITHUB_URL = prev;
		}
	});

	it('getVersionStatus fallbacks silencieux', async () => {
		await expect(getVersionStatus({
			pkg: { version: '1.0.0' },
			githubUrl: 'https://github.com/a/b',
			fetchFn: jest.fn().mockResolvedValue({ ok: false }),
		})).resolves.toMatchObject({ updateAvailable: false, latest: null });

		await expect(getVersionStatus({
			pkg: { version: '1.0.0' },
			githubUrl: 'https://github.com/a/b',
			fetchFn: jest.fn().mockResolvedValue({
				ok: true,
				json: async () => ({ tag_name: '' }),
			}),
		})).resolves.toMatchObject({ updateAvailable: false });

		await expect(getVersionStatus({
			pkg: { version: '1.0.0' },
			githubUrl: 'https://github.com/a/b',
			fetchFn: jest.fn().mockRejectedValue(new Error('network')),
		})).resolves.toMatchObject({ updateAvailable: false });

		await expect(getVersionStatus({
			pkg: { version: '1.0.0' },
			githubUrl: 'https://github.com/a/b',
			fetchFn: jest.fn().mockResolvedValue({
				ok: true,
				json: async () => ({ name: '1.0.1' }),
			}),
		})).resolves.toMatchObject({
			latest: '1.0.1',
			updateAvailable: true,
		});
	});
});
