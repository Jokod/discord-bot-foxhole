'use strict';

const {
	interpolateWarProgress,
	remainingUntil,
	formatDurationParts,
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
});
