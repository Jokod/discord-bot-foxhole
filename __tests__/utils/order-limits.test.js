'use strict';

const {
	SELECT_MAX_OPTIONS,
	MAX_SELECT_MENUS,
	MAX_ORDER_LINES,
	ORDER_BUTTON_ROWS,
	DISCORD_MAX_ACTION_ROWS,
	chunkLinesForSelects,
	isOrderBoardFull,
} = require('../../utils/order-limits.js');

describe('order-limits', () => {
	it('fixe 2 selects × 25 = 50 (marge embed + 2 rangées boutons)', () => {
		expect(DISCORD_MAX_ACTION_ROWS).toBe(5);
		expect(ORDER_BUTTON_ROWS).toBe(2);
		expect(SELECT_MAX_OPTIONS).toBe(25);
		expect(MAX_SELECT_MENUS).toBe(2);
		expect(MAX_ORDER_LINES).toBe(50);
	});

	it('chunkLinesForSelects découpe et plafonne à 50', () => {
		const lines = Array.from({ length: 80 }, (_, i) => ({ line_id: String(i) }));
		const chunks = chunkLinesForSelects(lines);
		expect(chunks).toHaveLength(2);
		expect(chunks[0]).toHaveLength(25);
		expect(chunks[1]).toHaveLength(25);
	});

	it('isOrderBoardFull', () => {
		expect(isOrderBoardFull(49)).toBe(false);
		expect(isOrderBoardFull(50)).toBe(true);
	});
});
