/**
 * Stable customId codec for Discord components.
 * Format: `prefix|part1|part2|...` (pipe separator).
 * Dual-parse also accepts legacy `prefix-part1-part2` during migration.
 */

const SEP = '|';
const LEGACY_SEP = '-';

/**
 * @param {string} prefix
 * @param {...string} parts
 * @returns {string}
 */
function encode(prefix, ...parts) {
	const safe = parts.map((p) => String(p ?? '').replaceAll(SEP, ''));
	return [prefix, ...safe].join(SEP);
}

/**
 * @param {string} customId
 * @returns {{ prefix: string, parts: string[] } | null}
 */
function decode(customId) {
	if (!customId || typeof customId !== 'string') return null;

	if (customId.includes(SEP)) {
		const [prefix, ...parts] = customId.split(SEP);
		return { prefix, parts };
	}

	// Legacy dual-parse: first segment before `-` is prefix
	const idx = customId.indexOf(LEGACY_SEP);
	if (idx === -1) {
		return { prefix: customId, parts: [] };
	}
	return {
		prefix: customId.slice(0, idx),
		parts: customId.slice(idx + 1).split(LEGACY_SEP),
	};
}

/**
 * Extract handler lookup key (prefix) for collections keyed by id.
 * Supports both `|` and `-` separators.
 * @param {string} customId
 * @returns {string}
 */
function getPrefix(customId) {
	if (!customId) return '';
	const pipe = customId.indexOf(SEP);
	if (pipe !== -1) return customId.slice(0, pipe);
	const dash = customId.indexOf(LEGACY_SEP);
	if (dash !== -1) return customId.slice(0, dash);
	return customId;
}

module.exports = {
	SEP,
	LEGACY_SEP,
	encode,
	decode,
	getPrefix,
};
