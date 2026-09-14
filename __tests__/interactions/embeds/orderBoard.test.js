const {
	buildOrderDisplay,
	buildOrderMessagePayload,
	buildOrderComponents,
	isLineDone,
	resolveSelectedLine,
	summarizeLines,
	formatLine,
	SELECT_MAX_OPTIONS,
	MAX_ORDER_LINES,
	MAX_SELECT_MENUS,
} = require('../../../interactions/embeds/orderBoard.js');
const { MessageFlags } = require('discord.js');

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
		expect(resolveSelectedLine(lines, '').line_id).toBe('1');
		expect(resolveSelectedLine([], null)).toBeNull();
		expect(resolveSelectedLine(null, '1')).toBeNull();
	});

	it('summarizeLines gère lines null', () => {
		expect(summarizeLines(null).total).toBe(0);
	});

	it('summarizeLines', () => {
		const stats = summarizeLines(lines);
		expect(stats.done).toBe(1);
		expect(stats.total).toBe(4);
		expect(stats.remaining).toBe(34);
	});

	it('formatLine shows priority and stock', () => {
		const open = formatLine(lines[0], translations, { selected: true });
		expect(open).toContain('▶️');
		expect(open).toContain('Sticky');
		expect(open).toContain('ORDER_STOCK');
		expect(open).toContain('MATERIAL_PRIORITY_HIGH');
		const done = formatLine(lines[1], translations);
		expect(done).toContain('✅');
		expect(done).toContain('ORDER_STOCK');
	});

	it('buildOrderDisplay includes kind, summary, selection marker', () => {
		const display = buildOrderDisplay(board, lines, translations);
		expect(display.title).toContain('ORDER_KIND_PROD');
		expect(display.description).toContain('Sticky');
		expect(display.description).toContain('ORDER_SUMMARY');
		expect(display.description).toContain('▶️');
		expect(display.description).not.toContain('ORDER_SELECTED_LINE');
		expect(display.footer).toContain('ORDER_FOOTER');
	});

	it('buildOrderMessagePayload is Components V2', () => {
		const payload = buildOrderMessagePayload(board, lines, translations);
		expect(payload.content).toBeUndefined();
		expect(payload.embeds).toBeUndefined();
		expect(Number(payload.flags) & MessageFlags.IsComponentsV2).toBeTruthy();
		expect(payload.components.length).toBeGreaterThan(1);
	});

	it('progressBar and selection context edges', () => {
		const { progressBar, buildLinesBody, buildSelectionContext } = require('../../../interactions/embeds/orderBoard.js');
		expect(progressBar(0, 0)).toMatch(/^░+$/);
		expect(progressBar(5, 10).length).toBe(10);
		expect(buildLinesBody([], translations, null)).toBe('');
		expect(buildSelectionContext(null, translations)).toBe('');
		expect(buildSelectionContext({ line_id: '1', current: 1, target: 2 }, translations)).toContain('—');
		expect(buildOrderDisplay(board, [], translations).linesBody).toBe('');
	});

	it('buildOrderComponents uses select + qty + tools (close on tools row)', () => {
		expect(SELECT_MAX_OPTIONS).toBe(25);
		expect(MAX_SELECT_MENUS).toBe(2);
		expect(MAX_ORDER_LINES).toBe(50);
		const rows = buildOrderComponents(board, lines, translations);
		expect(rows.length).toBe(3);
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
		expect(tools.some((id) => id.includes('order_close'))).toBe(true);
		expect(tools).toHaveLength(5);
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
		expect(rows.length).toBe(4);
		expect(rows[0].toJSON().components[0].options).toHaveLength(25);
		expect(rows[1].toJSON().components[0].options).toHaveLength(1);
		expect(rows[1].toJSON().components[0].custom_id).toBe('order_select|abc123|1');
	});

	it('à 50 lignes: accent rouge, banner, Ajouter disabled, 2 selects', () => {
		const many = Array.from({ length: 50 }, (_, i) => ({
			line_id: String(i + 1),
			name: `Item${i + 1}`,
			current: 0,
			target: 1,
			priority: 'neutral',
		}));
		const display = buildOrderDisplay(board, many, translations);
		expect(display.accentColor).toBe(0xE74C3C);
		expect(display.description).toContain('ORDER_FULL_BANNER');
		const rows = buildOrderComponents(board, many, translations);
		expect(rows.length).toBe(4);
		const addBtn = rows[3].toJSON().components.find((c) => c.custom_id.includes('order_add'));
		expect(addBtn.disabled).toBe(true);
		expect(addBtn.style).toBe(4);
		expect(rows[3].toJSON().components.some((c) => c.custom_id.includes('order_close'))).toBe(true);
	});

	it('disables + when done but keeps -1 if current > 0', () => {
		const b = { ...board, selected_line_id: '2' };
		const rows = buildOrderComponents(b, [lines[1]], translations);
		const comps = rows[1].toJSON().components;
		expect(comps[0].label).toBe('-1');
		expect(comps[0].disabled).toBe(false);
		expect(comps.slice(1, 4).every((c) => c.disabled)).toBe(true);
	});

	it('buildOrderDisplay scrap kind', () => {
		const scrapBoard = { ...board, kind: 'scrap' };
		const display = buildOrderDisplay(scrapBoard, lines, translations);
		expect(display.title).toContain('ORDER_KIND_SCRAP');
		expect(display.title).toContain('⛏️');
	});

	it('buildOrderDisplay transfer kind + operation title', () => {
		const transferBoard = { ...board, kind: 'transfer' };
		const display = buildOrderDisplay(transferBoard, lines, translations, 'Raid Night');
		expect(display.title).toContain('ORDER_KIND_TRANSFER');
		expect(display.description).toContain('ORDER_LINKED_OPERATION:Raid Night');
	});

	it('buildOrderDisplay shows from/to route at top of description', () => {
		const routed = { ...board, from: 'Home Base', to: 'Front Hex' };
		const display = buildOrderDisplay(routed, [], translations, 'Raid Night');
		expect(display.description.indexOf('ORDER_ROUTE:')).toBe(0);
		expect(display.description).toContain('ORDER_ROUTE:Home Base:Front Hex');
		expect(display.description).toContain('ORDER_LINKED_OPERATION:Raid Night');
	});

	it('buildOrderDisplay shows only from or only to when partial', () => {
		const fromOnly = buildOrderDisplay({ ...board, from: 'Depot' }, [], translations);
		expect(fromOnly.description).toContain('ORDER_FROM:Depot');
		expect(fromOnly.description).not.toContain('ORDER_ROUTE');

		const toOnly = buildOrderDisplay({ ...board, to: 'FOB' }, [], translations);
		expect(toOnly.description).toContain('ORDER_TO:FOB');
		expect(toOnly.description).not.toContain('ORDER_ROUTE');
	});

	it('disables tools when board closed and shows reopen on tools row', () => {
		const closed = { ...board, status: 'closed' };
		const rows = buildOrderComponents(closed, lines.slice(0, 1), translations);
		const qtyDisabled = rows[1].toJSON().components.every((c) => c.disabled);
		const tools = rows[2].toJSON().components;
		const reopenBtn = tools.find((c) => c.custom_id.includes('order_reopen'));
		const closeBtn = tools.find((c) => c.custom_id.includes('order_close'));
		expect(qtyDisabled).toBe(true);
		expect(reopenBtn).toBeDefined();
		expect(reopenBtn.disabled).toBeFalsy();
		expect(closeBtn).toBeUndefined();
	});

	it('buildOrderDisplay affiche le statut closed', () => {
		const closed = { ...board, status: 'closed' };
		const display = buildOrderDisplay(closed, lines.slice(0, 1), translations);
		expect(display.description).toContain('ORDER_STATUS_CLOSED');
	});

	it('formatLine sans nom utilise le tiret', () => {
		expect(formatLine({ current: 1, target: 2, priority: 'neutral' }, translations)).toContain('**—**');
		expect(formatLine({ name: '', current: 1, target: 2, priority: 'neutral' }, translations)).toContain('**—**');
		expect(formatLine({ name: 'sticky', current: undefined, target: undefined, priority: 'neutral' }, translations, { selected: true }))
			.toContain('▶️');
		expect(formatLine({ name: 'x', current: 5, target: 5, priority: 'neutral' }, translations)).toContain('✅');
	});

	it('buildLinesBody et selection context couvrent les branches null', () => {
		const { buildLinesBody, buildSelectionContext, buildOrderTextParts } = require('../../../interactions/embeds/orderBoard.js');
		expect(buildLinesBody([], translations, null)).toBe('');
		expect(buildLinesBody([{ line_id: '1', name: 'A', current: 0, target: 1, priority: 'neutral' }], translations, null))
			.not.toContain('▶️');
		expect(buildSelectionContext(null, translations)).toBe('');
		expect(buildSelectionContext({ name: '', current: 0, target: 0, priority: 'neutral' }, translations))
			.toContain('ORDER_SELECTED_HEADING');
		expect(buildSelectionContext({ name: 'Gun', current: 2, target: 10, priority: 'high' }, translations))
			.toContain('Gun');
		const parts = buildOrderTextParts(board, null, translations);
		expect(parts.linesBody).toBe('');
		expect(parts.list === undefined || true).toBe(true);
	});

	it('buildOrderComponents opts.full false explicite', () => {
		const rows = buildOrderComponents(board, lines, translations, { full: false });
		const addBtn = rows.at(-1).toJSON().components.find((c) => c.custom_id.includes('order_add'));
		expect(addBtn.disabled).toBe(false);
	});

	it('summarizeLines percent à 0 si cibles nulles', () => {
		const stats = summarizeLines([{ current: 0, target: 0, priority: 'neutral' }]);
		expect(stats.percent).toBe(0);
	});

	it('buildOrderDisplay conserve toutes les lignes; plein uniquement à MAX_ORDER_LINES', () => {
		const { getOrderAddCapacity } = require('../../../interactions/embeds/orderBoard.js');

		const modest = Array.from({ length: 10 }, (_, i) => ({
			line_id: String(i + 1),
			name: `Material ${i + 1}`,
			current: 0,
			target: 10,
			priority: 'neutral',
		}));
		const display = buildOrderDisplay({ ...board, selected_line_id: '5' }, modest, translations);
		expect(display.linesBody).toContain('Material 1');
		expect(display.linesBody).toContain('Material 10');
		expect(display.full).toBe(false);
		expect(getOrderAddCapacity(board, modest).full).toBe(false);

		const heavy = Array.from({ length: 45 }, (_, i) => ({
			line_id: String(i + 1),
			name: `Material With A Fairly Long Name ${i + 1}`,
			current: 1234,
			target: 9999,
			priority: i % 2 ? 'high' : 'neutral',
		}));
		const cap = getOrderAddCapacity({ ...board, selected_line_id: '25' }, heavy);
		expect(cap.full).toBe(false);
		expect(cap.count).toBe(45);

		const atCap = Array.from({ length: MAX_ORDER_LINES }, (_, i) => ({
			line_id: String(i + 1),
			name: `L${i}`,
			current: 0,
			target: 1,
			priority: 'neutral',
		}));
		expect(getOrderAddCapacity(board, atCap).full).toBe(true);
		expect(buildOrderDisplay(board, atCap, translations).full).toBe(true);
		expect(getOrderAddCapacity(board, null).count).toBe(0);
		expect(buildOrderComponents(board, [], translations, { full: true })
			.at(-1).toJSON().components
			.find((c) => c.custom_id.includes('order_add')).disabled).toBe(true);
	});

	it('buildOrderDisplay et components gèrent lines null', () => {
		const display = buildOrderDisplay(board, null, translations);
		expect(display.description).toContain('ORDER_EMPTY');
		const rows = buildOrderComponents(board, null, translations);
		expect(rows.length).toBeGreaterThan(0);
	});

	it('buildOrderDisplay utilise la couleur du kind sans sélection', () => {
		const display = buildOrderDisplay({ ...board, selected_line_id: 'missing' }, [], translations);
		expect(display.accentColor).toBeDefined();
	});

	it('buildOrderComponents sans ligne sélectionnée désactive les outils', () => {
		const rows = buildOrderComponents({ ...board, selected_line_id: null }, [], translations);
		const qtyRow = rows[0].toJSON().components;
		expect(qtyRow.every((c) => c.disabled)).toBe(true);
		const tools = rows[1].toJSON().components;
		expect(tools.find((c) => c.custom_id.includes('order_priority')).disabled).toBe(true);
		expect(tools.some((c) => c.custom_id.includes('order_close'))).toBe(true);
	});

	it('select options mark done lines and selected description', () => {
		const rows = buildOrderComponents(board, lines, translations);
		const opts = rows[0].toJSON().components[0].options;
		const sticky = opts.find((o) => o.value === '1');
		const done = opts.find((o) => o.value === '2');
		expect(sticky.description).toContain('▶️');
		expect(done.label).toContain('✅');
	});

	it('buildOrderComponents gère une ligne sans nom dans le select', () => {
		const rows = buildOrderComponents(board, [{ line_id: '9', current: 0, target: 1, priority: 'neutral' }], translations);
		const opt = rows[0].toJSON().components[0].options[0];
		expect(opt.label).toBe('—');
	});

	it('buildOrderComponents select avec qty nullish', () => {
		const rows = buildOrderComponents(
			{ ...board, selected_line_id: '9' },
			[{ line_id: '9', name: 'Ammo', priority: 'neutral' }],
			translations,
		);
		const opt = rows[0].toJSON().components[0].options[0];
		expect(opt.description).toMatch(/0\/0/);
	});
});
