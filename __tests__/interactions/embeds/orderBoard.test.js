const {
	buildOrderEmbed,
	buildOrderComponents,
	isLineDone,
	resolveSelectedLine,
	summarizeLines,
	formatLine,
	SELECT_MAX_OPTIONS,
	MAX_ORDER_LINES,
	MAX_SELECT_MENUS,
} = require('../../../interactions/embeds/orderBoard.js');

const translations = {
	translate: (key, params = {}) => {
		let s = key;
		Object.keys(params).forEach((p) => {
			s = `${s}:${params[p]}`;
		});
		return s;
	},
};

describe('orderBoard embeds', () => {
	const board = {
		_id: 'abc123',
		name: 'OP Front',
		kind: 'prod',
		status: 'open',
		selected_line_id: '1',
	};

	const lines = [
		{ line_id: '1', name: 'Sticky', current: 4, target: 20, category: 'utilities', priority: 'high' },
		{ line_id: '2', name: 'bmats', current: 20, target: 20, priority: 'neutral' },
		{ line_id: '3', name: 'RPG', current: 0, target: 9, priority: 'low' },
		{ line_id: '4', name: 'Extra', current: 1, target: 10, priority: 'neutral' },
	];

	it('isLineDone when current >= target > 0', () => {
		expect(isLineDone(lines[1])).toBe(true);
		expect(isLineDone(lines[0])).toBe(false);
		expect(isLineDone({ current: 0, target: 0 })).toBe(false);
	});

	it('resolveSelectedLine falls back to first', () => {
		expect(resolveSelectedLine(lines, '3').line_id).toBe('3');
		expect(resolveSelectedLine(lines, 'missing').line_id).toBe('1');
		expect(resolveSelectedLine([], null)).toBeNull();
	});

	it('summarizeLines', () => {
		const stats = summarizeLines(lines);
		expect(stats.done).toBe(1);
		expect(stats.total).toBe(4);
		expect(stats.remaining).toBe(34);
	});

	it('formatLine shows priority, stock and urgency', () => {
		const open = formatLine(lines[0], translations, { selected: true });
		expect(open).toContain('▶️');
		expect(open).toContain('Sticky');
		expect(open).toContain('ORDER_STOCK');
		expect(open).toContain('MATERIAL_PRIORITY_HIGH');
		expect(open).toContain('MATERIAL_URGENCY_URGENT');
		const done = formatLine(lines[1], translations);
		expect(done).toContain('✅');
		expect(done).toContain('ORDER_STOCK');
		expect(done).toContain('MATERIAL_URGENCY_LOW');
	});

	it('buildOrderEmbed includes kind, summary, selection marker', () => {
		const embed = buildOrderEmbed(board, lines, translations);
		const data = embed.toJSON();
		expect(data.title).toContain('ORDER_KIND_PROD');
		expect(data.description).toContain('Sticky');
		expect(data.description).toContain('ORDER_SUMMARY');
		expect(data.description).toContain('▶️');
		expect(data.description).not.toContain('ORDER_SELECTED_LINE');
		expect(data.footer.text).toContain('ORDER_FOOTER');
	});

	it('buildOrderEmbed empty state', () => {
		const embed = buildOrderEmbed(board, [], translations);
		expect(embed.toJSON().description).toContain('ORDER_EMPTY');
	});

	it('buildOrderComponents uses select + shared qty buttons without pagination', () => {
		expect(SELECT_MAX_OPTIONS).toBe(25);
		expect(MAX_SELECT_MENUS).toBe(2);
		expect(MAX_ORDER_LINES).toBe(50);
		const rows = buildOrderComponents(board, lines, translations);
		expect(rows.length).toBe(4);
		expect(rows[0].toJSON().components[0].custom_id).toContain('order_select');
		const qtyIds = rows[1].toJSON().components.map((c) => c.custom_id);
		expect(qtyIds[0]).toBe('order_qty|m1|abc123|1');
		expect(qtyIds[1]).toBe('order_qty|p1|abc123|1');
		expect(qtyIds[2]).toBe('order_qty|p4|abc123|1');
		expect(qtyIds[3]).toBe('order_qty|p9|abc123|1');
		expect(qtyIds[4]).toBe('order_qty|max|abc123|1');
		const tools = rows[2].toJSON().components.map((c) => c.custom_id);
		expect(tools.some((id) => id.includes('order_priority|abc123|1'))).toBe(true);
		expect(tools.some((id) => id.includes('order_add'))).toBe(true);
		expect(tools.some((id) => id.includes('order_delete_line|abc123|1'))).toBe(true);
		expect(tools.some((id) => id.includes('order_close'))).toBe(false);
		expect(rows[3].toJSON().components[0].custom_id).toContain('order_close');
		expect(tools.some((id) => id.includes('order_page'))).toBe(false);
	});

	it('ajoute un 2e select au-delà de 25 lignes', () => {
		const many = Array.from({ length: 26 }, (_, i) => ({
			line_id: String(i + 1),
			name: `Item${i + 1}`,
			current: 0,
			target: 1,
			priority: 'neutral',
		}));
		const rows = buildOrderComponents(board, many, translations);
		expect(rows.length).toBe(5);
		expect(rows[0].toJSON().components[0].options).toHaveLength(25);
		expect(rows[1].toJSON().components[0].options).toHaveLength(1);
		expect(rows[1].toJSON().components[0].custom_id).toBe('order_select|abc123|1');
	});

	it('à 50 lignes: embed rouge, banner, Ajouter disabled, 2 selects', () => {
		const many = Array.from({ length: 50 }, (_, i) => ({
			line_id: String(i + 1),
			name: `Item${i + 1}`,
			current: 0,
			target: 1,
			priority: 'neutral',
		}));
		const embed = buildOrderEmbed(board, many, translations);
		expect(embed.toJSON().color).toBe(0xE74C3C);
		expect(embed.toJSON().description).toContain('ORDER_FULL_BANNER');
		const rows = buildOrderComponents(board, many, translations);
		// 2 selects + qty + tools + close
		expect(rows.length).toBe(5);
		const addBtn = rows[3].toJSON().components.find((c) => c.custom_id.includes('order_add'));
		expect(addBtn.disabled).toBe(true);
		// ButtonStyle.Danger
		expect(addBtn.style).toBe(4);
		expect(rows[4].toJSON().components[0].custom_id).toContain('order_close');
	});

	it('disables + when done but keeps -1 if current > 0', () => {
		const b = { ...board, selected_line_id: '2' };
		const rows = buildOrderComponents(b, [lines[1]], translations);
		const comps = rows[1].toJSON().components;
		expect(comps[0].label).toBe('-1');
		expect(comps[0].disabled).toBe(false);
		expect(comps.slice(1, 4).every((c) => c.disabled)).toBe(true);
	});

	it('buildOrderEmbed scrap kind', () => {
		const scrapBoard = { ...board, kind: 'scrap' };
		const embed = buildOrderEmbed(scrapBoard, lines, translations);
		expect(embed.toJSON().title).toContain('ORDER_KIND_SCRAP');
		expect(embed.toJSON().title).toContain('⛏️');
	});

	it('buildOrderEmbed transfer kind + operation title', () => {
		const transferBoard = { ...board, kind: 'transfer' };
		const embed = buildOrderEmbed(transferBoard, lines, translations, 'Raid Night');
		const data = embed.toJSON();
		expect(data.title).toContain('ORDER_KIND_TRANSFER');
		expect(data.description).toContain('ORDER_LINKED_OPERATION:Raid Night');
	});

	it('disables tools when board closed and shows reopen', () => {
		const closed = { ...board, status: 'closed' };
		const rows = buildOrderComponents(closed, lines.slice(0, 1), translations);
		const qtyDisabled = rows[1].toJSON().components.every((c) => c.disabled);
		const reopenBtn = rows[3].toJSON().components.find((c) => c.custom_id.includes('order_reopen'));
		const closeBtn = rows[3].toJSON().components.find((c) => c.custom_id.includes('order_close'));
		expect(qtyDisabled).toBe(true);
		expect(reopenBtn).toBeDefined();
		expect(reopenBtn.disabled).toBeFalsy();
		expect(closeBtn).toBeUndefined();
	});
});
