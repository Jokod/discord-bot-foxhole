'use strict';

const {
	monthKey,
	memberBucket,
	activityBucket,
	fillMonths,
	MS,
} = require('../../.dashboard/lib/summary');

describe('dashboard summary helpers', () => {
	it('monthKey formats UTC YYYY-MM', () => {
		expect(monthKey('2026-03-15T12:00:00.000Z')).toBe('2026-03');
		expect(monthKey('not-a-date')).toBeNull();
	});

	it('memberBucket groups sizes', () => {
		expect(memberBucket(5)).toBe('1–9');
		expect(memberBucket(50)).toBe('50–99');
		expect(memberBucket(600)).toBe('500+');
	});

	it('activityBucket uses stable english keys', () => {
		const now = Date.UTC(2026, 0, 10);
		expect(activityBucket(null, now)).toBe('never');
		expect(activityBucket(new Date(now - 1000).toISOString(), now)).toBe('24h');
		expect(activityBucket(new Date(now - MS.d7 + 1000).toISOString(), now)).toBe('7d');
		expect(activityBucket(new Date(now - MS.d30 + 1000).toISOString(), now)).toBe('30d');
		expect(activityBucket(new Date(now - MS.d90 + 1000).toISOString(), now)).toBe('90d');
		expect(activityBucket(new Date(now - MS.d90 - 1000).toISOString(), now)).toBe('older');
	});

	it('memberBucket covers all ranges', () => {
		expect(memberBucket(25)).toBe('10–49');
		expect(memberBucket(150)).toBe('100–249');
		expect(memberBucket(300)).toBe('250–499');
	});

	it('fillMonths pads missing months with 0', () => {
		const map = new Map([['2026-01', 3]]);
		const out = fillMonths(map, 2);
		expect(out).toHaveLength(2);
		expect(out.every((row) => typeof row.month === 'string' && typeof row.count === 'number')).toBe(true);
	});

	it('fillMonths defaults to 12 months', () => {
		const out = fillMonths(new Map());
		expect(out).toHaveLength(12);
		expect(out.every((row) => row.count === 0)).toBe(true);
	});
});
