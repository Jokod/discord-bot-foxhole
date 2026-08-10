/**
 * Priority keys stored in DB (language-agnostic).
 * For display, use getPriorityTranslationKey() then translate with languages.
 */
const PRIORITY_LOW = 'low';
const PRIORITY_NEUTRAL = 'neutral';
const PRIORITY_HIGH = 'high';

const PRIORITIES = [PRIORITY_LOW, PRIORITY_NEUTRAL, PRIORITY_HIGH];
const DEFAULT_PRIORITY = PRIORITY_NEUTRAL;

/**
 * Returns the translation key (e.g. MATERIAL_PRIORITY_LOW) for a priority value.
 * @param {string|null|undefined} priority - Value from DB (low | neutral | high)
 * @returns {string} MATERIAL_PRIORITY_LOW | MATERIAL_PRIORITY_NEUTRAL | MATERIAL_PRIORITY_HIGH
 */
function getPriorityTranslationKey(priority) {
	const normalized = normalizePriority(priority);
	const keySuffix = normalized.charAt(0).toUpperCase() + normalized.slice(1);
	return `MATERIAL_PRIORITY_${keySuffix.toUpperCase()}`;
}

/**
 * Normalizes priority to a valid key (low | neutral | high). Unknown or null → neutral.
 * @param {string|null|undefined} priority
 * @returns {string} 'low' | 'neutral' | 'high'
 */
function normalizePriority(priority) {
	if (priority == null || priority === '') return DEFAULT_PRIORITY;
	const lower = String(priority).toLowerCase();
	if (PRIORITIES.includes(lower)) return lower;
	return DEFAULT_PRIORITY;
}

/** Triangle emoji by priority (low=🔻, neutral=➖, high=🔺) */
const PRIORITY_ARROW = {
	[PRIORITY_LOW]: '🔻',
	[PRIORITY_NEUTRAL]: '➖',
	[PRIORITY_HIGH]: '🔺',
};

/** Embed color (decimal) by priority for Discord embeds (sidebar) */
const PRIORITY_EMBED_COLOR = {
	[PRIORITY_LOW]: 0x57F287,
	[PRIORITY_NEUTRAL]: 0x95A5A6,
	[PRIORITY_HIGH]: 0xED4245,
};

/**
 * Returns the label with a triangle/trait emoji in front (e.g. "🔺 Haute", "➖ Neutre", "🔻 Faible").
 * @param {string|null|undefined} priority
 * @param {string} text - Translated label (e.g. "Faible", "Neutre", "Haute")
 * @returns {string}
 */
function getPriorityColoredText(priority, text) {
	const arrow = PRIORITY_ARROW[normalizePriority(priority)] ?? PRIORITY_ARROW[PRIORITY_NEUTRAL];
	return `${arrow} ${text}`;
}

/**
 * Returns the embed color (decimal) for the given priority.
 * @param {string|null|undefined} priority
 * @returns {number}
 */
function getPriorityEmbedColor(priority) {
	return PRIORITY_EMBED_COLOR[normalizePriority(priority)] ?? PRIORITY_EMBED_COLOR[PRIORITY_NEUTRAL];
}

/**
 * @param {string|null|undefined} priority
 * @returns {string} emoji
 */
function getPriorityArrow(priority) {
	return PRIORITY_ARROW[normalizePriority(priority)] ?? PRIORITY_ARROW[PRIORITY_NEUTRAL];
}

/** Cycle low → neutral → high → low */
function nextPriority(priority) {
	const current = normalizePriority(priority);
	const idx = PRIORITIES.indexOf(current);
	return PRIORITIES[(idx + 1) % PRIORITIES.length];
}

/** high first, then neutral, then low */
const PRIORITY_SORT_RANK = {
	[PRIORITY_HIGH]: 0,
	[PRIORITY_NEUTRAL]: 1,
	[PRIORITY_LOW]: 2,
};

/**
 * @param {string|null|undefined} priority
 * @returns {number}
 */
function getPrioritySortRank(priority) {
	return PRIORITY_SORT_RANK[normalizePriority(priority)] ?? 1;
}

module.exports = {
	PRIORITY_LOW,
	PRIORITY_NEUTRAL,
	PRIORITY_HIGH,
	PRIORITIES,
	DEFAULT_PRIORITY,
	PRIORITY_ARROW,
	getPriorityTranslationKey,
	getPriorityColoredText,
	getPriorityEmbedColor,
	getPriorityArrow,
	nextPriority,
	getPrioritySortRank,
	normalizePriority,
};
