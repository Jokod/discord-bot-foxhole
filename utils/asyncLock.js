'use strict';

/** @type {Map<string, Promise<unknown>>} */
const locks = new Map();

/**
 * Serialize async work per key (in-process). Used to avoid concurrent
 * legacy→V2 delete+repost creating orphan Discord messages.
 *
 * @template T
 * @param {string} key
 * @param {() => Promise<T>} fn
 * @returns {Promise<T>}
 */
function withAsyncLock(key, fn) {
	const prev = locks.get(key) || Promise.resolve();
	const run = async () => {
		try {
			await prev;
		}
		catch {
			// Previous task failed — still run the next one.
		}
		return fn();
	};
	const next = run();
	locks.set(key, next);
	return next.finally(() => {
		if (locks.get(key) === next) {
			locks.delete(key);
		}
	});
}

/**
 * Stable lock key for tracked-message cutover / refresh.
 * @param {string} serverId
 * @param {string} messageType
 */
function trackedLockKey(serverId, messageType) {
	return `tracked:${serverId}:${messageType}`;
}

module.exports = {
	withAsyncLock,
	trackedLockKey,
};
