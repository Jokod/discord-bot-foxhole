'use strict';

const { MIN_INTERVAL_MS, MAX_REQUESTS_PER_RUN } = require('../config/api');

function sleep(ms) {
	return new Promise((r) => setTimeout(r, ms));
}

class RateLimiter {
	/**
	 * @param {{ minIntervalMs?: number, maxRequests?: number, sleepFn?: typeof sleep }} [opts]
	 */
	constructor(opts = {}) {
		this.minIntervalMs = opts.minIntervalMs ?? MIN_INTERVAL_MS;
		this.maxRequests = opts.maxRequests ?? MAX_REQUESTS_PER_RUN;
		this.sleepFn = opts.sleepFn ?? sleep;
		this.requestCount = 0;
		this.lastRequestAt = 0;
	}

	reset() {
		this.requestCount = 0;
		this.lastRequestAt = 0;
	}

	async waitTurn() {
		if (this.requestCount >= this.maxRequests) {
			const { WikiRateLimitError } = require('./errors');
			throw new WikiRateLimitError();
		}
		const now = Date.now();
		const elapsed = now - this.lastRequestAt;
		if (this.lastRequestAt > 0 && elapsed < this.minIntervalMs) {
			await this.sleepFn(this.minIntervalMs - elapsed);
		}
		this.lastRequestAt = Date.now();
		this.requestCount += 1;
	}
}

module.exports = {
	sleep,
	RateLimiter,
};
