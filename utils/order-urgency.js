'use strict';

/**
 * Progress / urgency for order lines (actuel vs objectif).
 * Levels: urgent | ok | low (BAS = urgence basse, objectif atteint).
 */

const URGENCY_URGENT = 'urgent';
const URGENCY_OK = 'ok';
const URGENCY_LOW = 'low';

const URGENCY_EMOJI = {
	[URGENCY_URGENT]: '🔴',
	[URGENCY_OK]: '🟢',
	[URGENCY_LOW]: '🟠',
};

/**
 * @param {number} current
 * @param {number} target
 * @returns {number} 0–100+ (can exceed 100 if over target)
 */
function getProgressPercent(current, target) {
	const c = Number(current) || 0;
	const t = Number(target) || 0;
	if (t <= 0) return c > 0 ? 100 : 0;
	return Math.round((c / t) * 100);
}

/**
 * @param {number} percent
 * @returns {'urgent'|'ok'|'low'}
 */
function getUrgencyLevel(percent) {
	const p = Number(percent) || 0;
	if (p >= 100) return URGENCY_LOW;
	if (p >= 50) return URGENCY_OK;
	return URGENCY_URGENT;
}

/**
 * @param {object} line
 * @returns {'urgent'|'ok'|'low'}
 */
function getLineUrgency(line) {
	return getUrgencyLevel(getProgressPercent(line?.current, line?.target));
}

/**
 * @param {string} level
 * @returns {string} MATERIAL_URGENCY_URGENT | …_OK | …_LOW
 */
function getUrgencyTranslationKey(level) {
	const normalized = [URGENCY_URGENT, URGENCY_OK, URGENCY_LOW].includes(level)
		? level
		: URGENCY_OK;
	return `MATERIAL_URGENCY_${normalized.toUpperCase()}`;
}

/**
 * @param {string} level
 * @returns {string}
 */
function getUrgencyEmoji(level) {
	return URGENCY_EMOJI[level] ?? URGENCY_EMOJI[URGENCY_OK];
}

/**
 * @param {object} line
 * @param {{ translate: Function }} translations
 * @returns {string} e.g. "🔴 URGENT"
 */
function getUrgencyColoredText(line, translations) {
	const level = getLineUrgency(line);
	const label = translations.translate(getUrgencyTranslationKey(level));
	return `${getUrgencyEmoji(level)} ${label}`;
}

module.exports = {
	URGENCY_URGENT,
	URGENCY_OK,
	URGENCY_LOW,
	URGENCY_EMOJI,
	getProgressPercent,
	getUrgencyLevel,
	getLineUrgency,
	getUrgencyTranslationKey,
	getUrgencyEmoji,
	getUrgencyColoredText,
};
