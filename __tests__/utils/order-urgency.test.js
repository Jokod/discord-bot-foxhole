'use strict';

const {
	getProgressPercent,
	getUrgencyLevel,
	getLineUrgency,
	getUrgencyTranslationKey,
} = require('../../utils/order-urgency.js');

describe('order-urgency', () => {
	it('getProgressPercent', () => {
		expect(getProgressPercent(0, 200)).toBe(0);
		expect(getProgressPercent(100, 200)).toBe(50);
		expect(getProgressPercent(200, 200)).toBe(100);
		expect(getProgressPercent(5, 0)).toBe(100);
	});

	it('getUrgencyLevel thresholds', () => {
		expect(getUrgencyLevel(0)).toBe('urgent');
		expect(getUrgencyLevel(49)).toBe('urgent');
		expect(getUrgencyLevel(50)).toBe('ok');
		expect(getUrgencyLevel(99)).toBe('ok');
		expect(getUrgencyLevel(100)).toBe('low');
	});

	it('getLineUrgency + translation key', () => {
		expect(getLineUrgency({ current: 0, target: 200 })).toBe('urgent');
		expect(getUrgencyTranslationKey('urgent')).toBe('MATERIAL_URGENCY_URGENT');
		expect(getUrgencyTranslationKey('low')).toBe('MATERIAL_URGENCY_LOW');
	});
});
