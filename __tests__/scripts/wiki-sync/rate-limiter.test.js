'use strict';

const { sleep, RateLimiter } = require('../../../scripts/lib/wiki-sync/wiki/rate-limiter');
const { WikiRateLimitError } = require('../../../scripts/lib/wiki-sync/wiki/errors');

describe('wiki-sync / rate-limiter', () => {
	it('sleep resolves after delay', async () => {
		jest.useFakeTimers();
		const p = sleep(50);
		jest.advanceTimersByTime(50);
		await expect(p).resolves.toBeUndefined();
		jest.useRealTimers();
	});

	it('RateLimiter reset remet les compteurs à zéro', async () => {
		const sleepFn = jest.fn(async () => undefined);
		const limiter = new RateLimiter({ minIntervalMs: 100, maxRequests: 2, sleepFn });
		await limiter.waitTurn();
		limiter.reset();
		sleepFn.mockClear();
		await limiter.waitTurn();
		expect(sleepFn).not.toHaveBeenCalled();
	});

	it('RateLimiter attend minIntervalMs entre requêtes', async () => {
		const sleepFn = jest.fn(async () => undefined);
		const limiter = new RateLimiter({ minIntervalMs: 500, maxRequests: 10, sleepFn });
		limiter.lastRequestAt = Date.now();
		await limiter.waitTurn();
		expect(sleepFn).toHaveBeenCalledWith(expect.any(Number));
	});

	it('RateLimiter lève WikiRateLimitError au-delà du quota', async () => {
		const limiter = new RateLimiter({ minIntervalMs: 0, maxRequests: 1, sleepFn: async () => undefined });
		await limiter.waitTurn();
		await expect(limiter.waitTurn()).rejects.toBeInstanceOf(WikiRateLimitError);
	});

	it('RateLimiter utilise les valeurs par défaut de config/api', async () => {
		const limiter = new RateLimiter();
		await limiter.waitTurn();
		expect(limiter.requestCount).toBe(1);
	});
});
