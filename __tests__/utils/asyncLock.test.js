'use strict';

const { withAsyncLock, trackedLockKey } = require('../../utils/asyncLock.js');

describe('asyncLock', () => {
	it('trackedLockKey is stable', () => {
		expect(trackedLockKey('g1', 'stockpile_list')).toBe('tracked:g1:stockpile_list');
	});

	it('withAsyncLock serializes work for the same key', async () => {
		const order = [];
		const slow = withAsyncLock('k', async () => {
			order.push('start-a');
			await new Promise((r) => setTimeout(r, 30));
			order.push('end-a');
			return 'a';
		});
		const fast = withAsyncLock('k', async () => {
			order.push('start-b');
			order.push('end-b');
			return 'b';
		});
		await expect(Promise.all([slow, fast])).resolves.toEqual(['a', 'b']);
		expect(order).toEqual(['start-a', 'end-a', 'start-b', 'end-b']);
	});

	it('withAsyncLock isolates different keys', async () => {
		let concurrent = 0;
		let maxConcurrent = 0;
		const run = (key) => withAsyncLock(key, async () => {
			concurrent += 1;
			maxConcurrent = Math.max(maxConcurrent, concurrent);
			await new Promise((r) => setTimeout(r, 20));
			concurrent -= 1;
		});
		await Promise.all([run('x'), run('y')]);
		expect(maxConcurrent).toBe(2);
	});

	it('withAsyncLock continues after a rejected task', async () => {
		await expect(withAsyncLock('err', async () => {
			throw new Error('boom');
		})).rejects.toThrow('boom');
		await expect(withAsyncLock('err', async () => 'ok')).resolves.toBe('ok');
	});

	it('withAsyncLock finally n’efface pas un lock remplacé', async () => {
		let releaseA;
		const gate = new Promise((r) => { releaseA = r; });
		const a = withAsyncLock('replace', async () => {
			await gate;
			return 'a';
		});
		// Let A register as current lock
		await Promise.resolve();
		const b = withAsyncLock('replace', async () => 'b');
		releaseA();
		await expect(Promise.all([a, b])).resolves.toEqual(['a', 'b']);
		await expect(withAsyncLock('replace', async () => 'c')).resolves.toBe('c');
	});
});
