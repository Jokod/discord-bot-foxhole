'use strict';

const {
	interpolateWarProgress,
	remainingUntil,
	formatDurationParts,
	splitDuration,
	DAY_MS,
} = require('../../shared/warProgress');

describe('warProgress', () => {
	it('interpolates day/hours/minutes/seconds from conquestStartTime', () => {
		const start = Date.UTC(2026, 0, 1, 0, 0, 0);
		const now = start + (2 * 24 + 5) * 60 * 60 * 1000 + 12 * 60 * 1000 + 40 * 1000;
		expect(interpolateWarProgress(start, null, now)).toEqual({
			elapsedMs: now - start,
			dayOfWar: 3,
			days: 2,
			hours: 5,
			minutes: 12,
			seconds: 40,
			ended: false,
		});
	});

	it('freezes elapsed at conquestEndTime when ended', () => {
		const start = Date.UTC(2026, 0, 1, 0, 0, 0);
		const end = start + 2 * 24 * 60 * 60 * 1000;
		const now = end + 60 * 60 * 1000;
		const progress = interpolateWarProgress(start, end, now);
		expect(progress.ended).toBe(true);
		expect(progress.days).toBe(2);
		expect(progress.hours).toBe(0);
		expect(progress.seconds).toBe(0);
	});

	it('remainingUntil counts down with seconds', () => {
		const now = Date.UTC(2026, 5, 1, 0, 0, 0);
		const target = now + 15 * 24 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000 + 42 * 60 * 1000 + 38 * 1000;
		expect(remainingUntil(target, now)).toEqual({
			days: 15,
			hours: 3,
			minutes: 42,
			seconds: 38,
			totalMs: target - now,
			expired: false,
		});
	});

	it('remainingUntil marks expired past target', () => {
		const now = Date.now();
		expect(remainingUntil(now - 1000, now)).toMatchObject({
			days: 0,
			hours: 0,
			minutes: 0,
			seconds: 0,
			totalMs: 0,
			expired: true,
		});
	});

	it('formatDurationParts pads h/m/s', () => {
		expect(formatDurationParts({ days: 25, hours: 3, minutes: 7, seconds: 9 })).toEqual({
			d: '25',
			h: '03',
			m: '07',
			s: '09',
		});
	});

	it('interpolateWarProgress returns nulls without start', () => {
		expect(interpolateWarProgress(null)).toMatchObject({
			elapsedMs: null,
			dayOfWar: null,
			ended: false,
		});
		expect(interpolateWarProgress('bad')).toMatchObject({ dayOfWar: null });
	});

	it('remainingUntil returns expired for invalid target', () => {
		expect(remainingUntil(null)).toMatchObject({
			totalMs: null,
			expired: true,
			days: null,
		});
		expect(remainingUntil(Number.NaN)).toMatchObject({ expired: true });
	});

	it('formatDurationParts returns dashes for empty parts', () => {
		expect(formatDurationParts(null)).toEqual({ d: '—', h: '—', m: '—', s: '—' });
		expect(formatDurationParts({ days: null })).toEqual({ d: '—', h: '—', m: '—', s: '—' });
	});

	it('splitDuration clamp negative ms', () => {
		expect(splitDuration(-1000)).toMatchObject({ days: 0, hours: 0, minutes: 0, seconds: 0 });
	});

	it('interpolateWarProgress ended false si conquestEndTime 0', () => {
		const start = Date.UTC(2026, 0, 1);
		const progress = interpolateWarProgress(start, 0, start + DAY_MS);
		expect(progress.ended).toBe(false);
	});

	it('expose WarProgress sans module.exports si exports null', () => {
		const fs = require('fs');
		const vm = require('vm');
		const src = fs.readFileSync(require.resolve('../../shared/warProgress.js'), 'utf8');
		const sandbox = { module: { exports: null }, globalThis: {} };
		sandbox.globalThis = sandbox;
		vm.runInNewContext(src, sandbox);
		expect(typeof sandbox.WarProgress.interpolateWarProgress).toBe('function');
	});

	it('expose WarProgress sans module.exports si exports absent', () => {
		const fs = require('fs');
		const vm = require('vm');
		const src = fs.readFileSync(require.resolve('../../shared/warProgress.js'), 'utf8');
		const sandbox = { module: {}, globalThis: {} };
		sandbox.globalThis = sandbox;
		vm.runInNewContext(src, sandbox);
		expect(typeof sandbox.WarProgress.interpolateWarProgress).toBe('function');
		expect(sandbox.module.exports).toBeUndefined();
	});

	it('expose WarProgress sur globalThis sans module.exports', () => {
		const fs = require('fs');
		const vm = require('vm');
		const src = fs.readFileSync(require.resolve('../../shared/warProgress.js'), 'utf8');
		const sandbox = { globalThis: {} };
		sandbox.globalThis = sandbox;
		vm.runInNewContext(src, sandbox);
		expect(typeof sandbox.WarProgress.splitDuration).toBe('function');
		expect(typeof sandbox.globalThis.WarProgress.splitDuration).toBe('function');
	});

	it('expose WarProgress via module.exports en contexte Node', () => {
		const fs = require('fs');
		const vm = require('vm');
		const src = fs.readFileSync(require.resolve('../../shared/warProgress.js'), 'utf8');
		const sandbox = { module: { exports: {} }, globalThis: {} };
		sandbox.globalThis = sandbox;
		vm.runInNewContext(src, sandbox);
		expect(typeof sandbox.module.exports.interpolateWarProgress).toBe('function');
		expect(typeof sandbox.WarProgress.interpolateWarProgress).toBe('function');
	});
});
