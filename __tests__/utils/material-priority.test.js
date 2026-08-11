'use strict';

const {
	PRIORITY_LOW,
	PRIORITY_NEUTRAL,
	PRIORITY_HIGH,
	normalizePriority,
	getPriorityTranslationKey,
	getPriorityColoredText,
	getPriorityEmbedColor,
	getPriorityArrow,
	nextPriority,
	getPrioritySortRank,
} = require('../../utils/material-priority.js');

describe('material-priority', () => {
	it('normalizePriority gère null, vide et valeurs inconnues', () => {
		expect(normalizePriority(null)).toBe(PRIORITY_NEUTRAL);
		expect(normalizePriority('')).toBe(PRIORITY_NEUTRAL);
		expect(normalizePriority(undefined)).toBe(PRIORITY_NEUTRAL);
		expect(normalizePriority('URGENT')).toBe(PRIORITY_NEUTRAL);
	});

	it('normalizePriority accepte low, neutral, high (case insensitive)', () => {
		expect(normalizePriority('LOW')).toBe(PRIORITY_LOW);
		expect(normalizePriority('High')).toBe(PRIORITY_HIGH);
		expect(normalizePriority('neutral')).toBe(PRIORITY_NEUTRAL);
	});

	it('getPriorityTranslationKey retourne la clé i18n', () => {
		expect(getPriorityTranslationKey('high')).toBe('MATERIAL_PRIORITY_HIGH');
		expect(getPriorityTranslationKey(null)).toBe('MATERIAL_PRIORITY_NEUTRAL');
	});

	it('getPriorityColoredText, getPriorityEmbedColor et getPriorityArrow par priorité', () => {
		expect(getPriorityColoredText('low', 'Faible')).toBe('🔻 Faible');
		expect(getPriorityColoredText('neutral', 'Neutre')).toBe('➖ Neutre');
		expect(getPriorityColoredText('high', 'Haute')).toBe('🔺 Haute');
		expect(getPriorityArrow('high')).toBe('🔺');
		expect(getPriorityEmbedColor('high')).toBe(0xED4245);
		expect(getPriorityEmbedColor('low')).toBe(0x57F287);
		expect(getPriorityEmbedColor('neutral')).toBe(0x95A5A6);
	});

	it('nextPriority cycle low → neutral → high → low', () => {
		expect(nextPriority('low')).toBe(PRIORITY_NEUTRAL);
		expect(nextPriority('neutral')).toBe(PRIORITY_HIGH);
		expect(nextPriority('high')).toBe(PRIORITY_LOW);
	});

	it('getPrioritySortRank trie high en premier', () => {
		expect(getPrioritySortRank('high')).toBe(0);
		expect(getPrioritySortRank('neutral')).toBe(1);
		expect(getPrioritySortRank('low')).toBe(2);
	});
});
