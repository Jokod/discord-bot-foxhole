const {
	PRIORITY_LOW,
	PRIORITY_NEUTRAL,
	PRIORITY_HIGH,
	PRIORITIES,
	DEFAULT_PRIORITY,
	getPriorityTranslationKey,
	getPriorityColoredText,
	getPriorityEmbedColor,
	normalizePriority,
} = require('../../utils/material-priority.js');

describe('utils/material-priority', () => {
	describe('constants', () => {
		it('exports priority keys as lowercase English', () => {
			expect(PRIORITY_LOW).toBe('low');
			expect(PRIORITY_NEUTRAL).toBe('neutral');
			expect(PRIORITY_HIGH).toBe('high');
		});

		it('PRIORITIES contains all three keys', () => {
			expect(PRIORITIES).toEqual(['low', 'neutral', 'high']);
		});

		it('DEFAULT_PRIORITY is neutral', () => {
			expect(DEFAULT_PRIORITY).toBe('neutral');
		});
	});

	describe('normalizePriority', () => {
		it('returns neutral for null and undefined', () => {
			expect(normalizePriority(null)).toBe('neutral');
			expect(normalizePriority(undefined)).toBe('neutral');
		});

		it('returns neutral for empty string', () => {
			expect(normalizePriority('')).toBe('neutral');
		});

		it('returns valid key when given low, neutral, high (case insensitive)', () => {
			expect(normalizePriority('low')).toBe('low');
			expect(normalizePriority('LOW')).toBe('low');
			expect(normalizePriority('neutral')).toBe('neutral');
			expect(normalizePriority('Neutral')).toBe('neutral');
			expect(normalizePriority('high')).toBe('high');
			expect(normalizePriority('HIGH')).toBe('high');
		});

		it('returns neutral for unknown value', () => {
			expect(normalizePriority('unknown')).toBe('neutral');
			expect(normalizePriority('faible')).toBe('neutral');
			expect(normalizePriority(42)).toBe('neutral');
		});
	});

	describe('getPriorityTranslationKey', () => {
		it('returns MATERIAL_PRIORITY_LOW for low', () => {
			expect(getPriorityTranslationKey('low')).toBe('MATERIAL_PRIORITY_LOW');
		});

		it('returns MATERIAL_PRIORITY_NEUTRAL for neutral', () => {
			expect(getPriorityTranslationKey('neutral')).toBe('MATERIAL_PRIORITY_NEUTRAL');
		});

		it('returns MATERIAL_PRIORITY_HIGH for high', () => {
			expect(getPriorityTranslationKey('high')).toBe('MATERIAL_PRIORITY_HIGH');
		});

		it('returns MATERIAL_PRIORITY_NEUTRAL for null/undefined', () => {
			expect(getPriorityTranslationKey(null)).toBe('MATERIAL_PRIORITY_NEUTRAL');
			expect(getPriorityTranslationKey(undefined)).toBe('MATERIAL_PRIORITY_NEUTRAL');
		});

		it('returns MATERIAL_PRIORITY_NEUTRAL for unknown value', () => {
			expect(getPriorityTranslationKey('invalid')).toBe('MATERIAL_PRIORITY_NEUTRAL');
		});
	});

	describe('getPriorityColoredText', () => {
		it('prepends colored triangle emoji to the label', () => {
			expect(getPriorityColoredText('high', 'Haute')).toBe('🔺 Haute');
			expect(getPriorityColoredText('low', 'Faible')).toBe('🔻 Faible');
			expect(getPriorityColoredText('neutral', 'Neutre')).toBe('➖ Neutre');
		});
	});

	describe('getPriorityEmbedColor', () => {
		it('returns a number for each priority', () => {
			expect(typeof getPriorityEmbedColor('low')).toBe('number');
			expect(typeof getPriorityEmbedColor('neutral')).toBe('number');
			expect(typeof getPriorityEmbedColor('high')).toBe('number');
		});

		it('returns different colors for low vs high', () => {
			expect(getPriorityEmbedColor('low')).not.toBe(getPriorityEmbedColor('high'));
		});
	});
});
