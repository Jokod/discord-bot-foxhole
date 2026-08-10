'use strict';

/**
 * Discord message component limits for order boards.
 * Max 5 action rows: 2 for buttons, we use at most 2 selects × 25
 * (leaves headroom for embed description ~4096 chars with priority + stock + urgency).
 */
const DISCORD_MAX_ACTION_ROWS = 5;
const ORDER_BUTTON_ROWS = 2;
const SELECT_MAX_OPTIONS = 25;
/** Cap below Discord's theoretical 3 selects so embed text stays readable. */
const MAX_SELECT_MENUS = 2;
const MAX_ORDER_LINES = MAX_SELECT_MENUS * SELECT_MAX_OPTIONS;

/**
 * @param {Array} lines
 * @returns {Array[]} chunks of at most SELECT_MAX_OPTIONS, capped to MAX_SELECT_MENUS
 */
function chunkLinesForSelects(lines) {
	const list = (lines || []).slice(0, MAX_ORDER_LINES);
	const chunks = [];
	for (let i = 0; i < list.length; i += SELECT_MAX_OPTIONS) {
		chunks.push(list.slice(i, i + SELECT_MAX_OPTIONS));
	}
	return chunks.slice(0, MAX_SELECT_MENUS);
}

function isOrderBoardFull(lineCount) {
	return Number(lineCount) >= MAX_ORDER_LINES;
}

module.exports = {
	DISCORD_MAX_ACTION_ROWS,
	ORDER_BUTTON_ROWS,
	SELECT_MAX_OPTIONS,
	MAX_SELECT_MENUS,
	MAX_ORDER_LINES,
	chunkLinesForSelects,
	isOrderBoardFull,
};
