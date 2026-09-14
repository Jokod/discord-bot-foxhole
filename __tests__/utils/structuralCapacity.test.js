'use strict';

/**
 * Structural capacity only (no character budget).
 */

const { MAX_ORDER_LINES, isOrderBoardFull } = require('../../utils/order-limits.js');
const { STOCKPILE_MAX_ACTIVE } = require('../../utils/constants.js');
const { getOrderAddCapacity } = require('../../interactions/embeds/orderBoard.js');
const en = require('../../languages/en.js');
const fr = require('../../languages/fr.js');
const es = require('../../languages/es.js');
const ru = require('../../languages/ru.js');
const zh = require('../../languages/zh-cn.js');

describe('structural capacity', () => {
	it.each([
		['en', en],
		['fr', fr],
		['es', es],
		['ru', ru],
		['zh-cn', zh],
	])('%s expose ORDER_FULL / STOCKPILE_MAX / DISPLAY_UPDATE_FAILED', (_code, L) => {
		expect(L.ORDER_FULL).toMatch(/order create/i);
		expect(L.ORDER_FULL_BANNER).toBeTruthy();
		expect(L.STOCKPILE_MAX_REACHED).toMatch(/stockpile manage/i);
		expect(L.DISPLAY_UPDATE_FAILED).toBeTruthy();
	});

	it('plafonds Discord UI', () => {
		expect(MAX_ORDER_LINES).toBe(50);
		expect(STOCKPILE_MAX_ACTIVE).toBe(15);
		expect(isOrderBoardFull(49)).toBe(false);
		expect(isOrderBoardFull(50)).toBe(true);
	});

	it('getOrderAddCapacity is count-only', () => {
		const board = { _id: 'b1', name: 'OP', kind: 'prod', status: 'open' };
		const lines = Array.from({ length: 40 }, (_, i) => ({
			line_id: String(i + 1),
			name: `Material With A Fairly Long Name ${i + 1}`,
			current: 999999,
			target: 999999,
			priority: 'critical',
		}));
		const cap = getOrderAddCapacity(board, lines);
		expect(cap).toEqual({ count: 40, max: 50, full: false });
		expect(getOrderAddCapacity(board, Array.from({ length: 50 }, (_, i) => ({
			line_id: String(i + 1),
			name: 'x',
			current: 0,
			target: 1,
			priority: 'neutral',
		}))).full).toBe(true);
	});
});
