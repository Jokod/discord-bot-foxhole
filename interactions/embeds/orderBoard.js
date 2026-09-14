const {
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
	StringSelectMenuBuilder,
	StringSelectMenuOptionBuilder,
} = require('discord.js');
const { safeEscapeMarkdown } = require('../../utils/markdown.js');
const { encode } = require('../../shared/customId.js');
const {
	getPriorityColoredText,
	getPriorityTranslationKey,
	getPriorityEmbedColor,
	getPriorityArrow,
	normalizePriority,
} = require('../../utils/material-priority.js');
const { getOrderKindMeta } = require('../../utils/order-kinds.js');
const {
	SELECT_MAX_OPTIONS,
	MAX_ORDER_LINES,
	MAX_SELECT_MENUS,
	chunkLinesForSelects,
	isOrderBoardFull,
} = require('../../utils/order-limits.js');
const {
	buildV2Payload,
	joinBlocks,
	chunkMarkdown,
} = require('../../utils/componentsV2.js');

const MESSAGE_TYPE_BOARD = 'order_board';
const BOARD_FULL_COLOR = 0xE74C3C;
const PROGRESS_BAR_WIDTH = 10;
/** Matches OrderLine.name maxlength. */
const ORDER_LINE_NAME_MAX = 100;

function isLineDone(line) {
	const current = Number(line.current) || 0;
	const target = Number(line.target) || 0;
	return target > 0 && current >= target;
}

/**
 * @param {Array} lines
 * @param {string|null|undefined} selectedLineId
 */
function resolveSelectedLine(lines, selectedLineId) {
	const list = lines || [];
	if (!list.length) return null;
	if (selectedLineId) {
		const found = list.find((l) => String(l.line_id) === String(selectedLineId));
		if (found) return found;
	}
	return list[0];
}

/**
 * @param {Array} lines
 */
function summarizeLines(lines) {
	const list = lines || [];
	let done = 0;
	let currentSum = 0;
	let targetSum = 0;
	for (const line of list) {
		if (isLineDone(line)) done += 1;
		currentSum += Number(line.current) || 0;
		targetSum += Number(line.target) || 0;
	}
	const remaining = Math.max(0, targetSum - currentSum);
	const percent = targetSum > 0
		? Math.min(100, Math.round((currentSum / targetSum) * 100))
		: 0;
	return {
		total: list.length,
		done,
		currentSum,
		targetSum,
		remaining,
		percent,
	};
}

/**
 * Text progress bar for the selected line only.
 * @param {number} current
 * @param {number} target
 * @param {number} [width=10]
 */
function progressBar(current, target, width = PROGRESS_BAR_WIDTH) {
	const t = Number(target) || 0;
	const c = Math.max(0, Number(current) || 0);
	if (t <= 0) return '░'.repeat(width);
	const filled = Math.min(width, Math.round((Math.min(c, t) / t) * width));
	return `${'█'.repeat(filled)}${'░'.repeat(width - filled)}`;
}

/**
 * @param {object} line
 * @param {object} translations
 * @param {{ selected?: boolean }} [opts]
 */
function formatLine(line, translations, opts = {}) {
	const name = line.name
		? safeEscapeMarkdown(line.name.charAt(0).toUpperCase() + line.name.slice(1))
		: '—';
	const current = Number(line.current) || 0;
	const target = Number(line.target) || 0;
	const prio = getPriorityColoredText(
		line.priority,
		translations.translate(getPriorityTranslationKey(line.priority)),
	);
	const marker = opts.selected ? '▶️ ' : '　';
	const doneBit = isLineDone(line) ? ' ✅' : '';
	const stock = translations.translate('ORDER_STOCK', { current, target });

	return `${marker}**${name}**${doneBit} · ${prio} · ${stock}`;
}

/**
 * Route / OP / status banners (no title, no summary, no line list).
 * @returns {string[]}
 */
function buildMetaLines(board, list, translations, operationTitle) {
	const closed = board.status === 'closed';
	const full = isOrderBoardFull(list.length);
	/** @type {string[]} */
	const parts = [];

	const from = typeof board.from === 'string' ? board.from.trim() : '';
	const to = typeof board.to === 'string' ? board.to.trim() : '';
	if (from && to) {
		parts.push(translations.translate('ORDER_ROUTE', {
			from: safeEscapeMarkdown(from),
			to: safeEscapeMarkdown(to),
		}));
	}
	else if (from) {
		parts.push(translations.translate('ORDER_FROM', {
			from: safeEscapeMarkdown(from),
		}));
	}
	else if (to) {
		parts.push(translations.translate('ORDER_TO', {
			to: safeEscapeMarkdown(to),
		}));
	}

	if (operationTitle) {
		parts.push(translations.translate('ORDER_LINKED_OPERATION', {
			title: safeEscapeMarkdown(operationTitle),
		}));
	}
	if (closed) {
		parts.push(`*${translations.translate('ORDER_STATUS_CLOSED')}*`);
	}
	if (full && !closed) {
		parts.push(translations.translate('ORDER_FULL_BANNER', {
			count: list.length,
			max: MAX_ORDER_LINES,
		}));
	}

	return parts;
}

/**
 * Header meta (route, OP, banners, summary) — no title, no line list.
 */
function buildHeaderMeta(board, list, translations, operationTitle) {
	const parts = buildMetaLines(board, list, translations, operationTitle);

	if (!list.length) {
		parts.push(translations.translate('ORDER_EMPTY'));
		return parts.join('\n\n');
	}

	const stats = summarizeLines(list);
	parts.push(translations.translate('ORDER_SUMMARY', {
		done: stats.done,
		total: stats.total,
		current: stats.currentSum,
		target: stats.targetSum,
		remaining: stats.remaining,
	}));

	return parts.join('\n\n');
}

/**
 * Line list text — full list (capacity is enforced before add, not by truncating).
 * @param {Array} list
 * @param {object} translations
 * @param {object} selected
 */
function buildLinesBody(list, translations, selected) {
	if (!list.length) return '';

	const selectedId = selected ? String(selected.line_id) : null;
	return list.map((line) => formatLine(line, translations, {
		selected: selectedId != null && String(line.line_id) === selectedId,
	})).join('\n');
}

/**
 * @param {object} line
 * @param {object} translations
 */
function buildSelectionContext(line, translations) {
	if (!line) return '';
	const name = line.name
		? safeEscapeMarkdown(line.name.charAt(0).toUpperCase() + line.name.slice(1))
		: '—';
	const current = Number(line.current) || 0;
	const target = Number(line.target) || 0;
	const left = Math.max(0, target - current);
	const percent = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0;
	const prio = getPriorityColoredText(
		line.priority,
		translations.translate(getPriorityTranslationKey(line.priority)),
	);
	const stock = translations.translate('ORDER_STOCK', { current, target });
	const bar = progressBar(current, target);
	const heading = translations.translate('ORDER_SELECTED_HEADING');
	const detail = translations.translate('ORDER_SELECTED_DETAIL', {
		name,
		priority: prio,
		stock,
		bar,
		percent,
		left,
	});
	return `${heading}\n${detail}`;
}

/**
 * Text parts of the order board container (chunked for Discord text limits).
 * Layout: title → meta → summary → lines → selection → footer
 * @returns {{ header: string, linesBody: string, selection: string, footerText: string, footer: string, children: Array, selected: object|null, title: string }}
 */
function buildOrderTextParts(board, lines, translations, operationTitle = null) {
	const kindMeta = getOrderKindMeta(board.kind);
	const title = `${kindMeta.emoji} ${translations.translate(kindMeta.i18n)} — ${safeEscapeMarkdown(board.name)}`;
	const list = lines || [];
	const selected = resolveSelectedLine(list, board.selected_line_id);
	const closed = board.status === 'closed';
	const statusLabel = translations.translate(closed ? 'ORDER_STATUS_LABEL_CLOSED' : 'ORDER_STATUS_LABEL_OPEN');
	const footer = translations.translate('ORDER_FOOTER', {
		lines: list.length,
		status: statusLabel,
	});
	const metaLines = buildMetaLines(board, list, translations, operationTitle);
	const meta = metaLines.join('\n');
	const stats = list.length
		? summarizeLines(list)
		: null;
	const summary = !list.length
		? translations.translate('ORDER_EMPTY')
		: translations.translate('ORDER_SUMMARY', {
			done: stats.done,
			total: stats.total,
			current: stats.currentSum,
			target: stats.targetSum,
			remaining: stats.remaining,
		});
	const titleBlock = `### ${title.slice(0, 250)}`;
	const header = [titleBlock, meta, summary].filter(Boolean).join('\n\n');
	const selection = selected ? buildSelectionContext(selected, translations) : '';
	const footerText = `*${footer.slice(0, 2048)}*`;
	const linesBody = list.length ? buildLinesBody(list, translations, selected) : '';

	/** @type {Array<string|object|Array>} */
	const zones = [
		[titleBlock, meta || null].filter(Boolean),
		summary,
		linesBody ? chunkMarkdown(linesBody) : null,
		selection || null,
		footerText,
	];
	const children = joinBlocks(zones, { break: 'large' });

	return { header, linesBody, selection, footerText, footer, children, selected, title };
}

/**
 * Structural capacity only (select menus): count vs MAX_ORDER_LINES.
 * @returns {{ count: number, max: number, full: boolean }}
 */
function getOrderAddCapacity(board, lines) {
	void board;
	const list = lines || [];
	const count = list.length;
	const full = isOrderBoardFull(count);
	return {
		count,
		max: MAX_ORDER_LINES,
		full,
	};
}

/**
 * Single-body description for tests / legacy consumers (no truncation).
 */
function buildDescriptionParts(board, list, translations, operationTitle, selected) {
	const header = buildHeaderMeta(board, list, translations, operationTitle);
	if (!list.length) {
		return header;
	}
	const linesBody = buildLinesBody(list, translations, selected);
	return `${header}\n\n${linesBody}`;
}

/**
 * @param {object} board
 * @param {Array} lines
 * @param {import('../../utils/translations.js')} translations
 * @param {string|null} [operationTitle]
 * @returns {{ accentColor: number, title: string, description: string, footer: string, body: string, header: string, linesBody: string, selection: string, children: Array, full: boolean }}
 */
function buildOrderDisplay(board, lines, translations, operationTitle = null) {
	const kindMeta = getOrderKindMeta(board.kind);
	const list = lines || [];
	const full = isOrderBoardFull(list.length);
	const selected = resolveSelectedLine(list, board.selected_line_id);
	const closed = board.status === 'closed';
	const accentColor = closed
		? 0x95A5A6
		: (full
			? BOARD_FULL_COLOR
			: (selected ? getPriorityEmbedColor(selected.priority) : kindMeta.color));

	const parts = buildOrderTextParts(board, list, translations, operationTitle);
	const description = buildDescriptionParts(board, list, translations, operationTitle, selected);
	const body = [parts.header, parts.linesBody, parts.selection, parts.footerText]
		.filter(Boolean)
		.join('\n\n');

	return {
		accentColor,
		title: parts.title.slice(0, 256),
		description,
		footer: parts.footer.slice(0, 2048),
		header: parts.header,
		linesBody: parts.linesBody,
		selection: parts.selection,
		body,
		children: parts.children,
		full,
	};
}

/**
 * Full Components V2 payload for an order board message.
 */
function buildOrderMessagePayload(board, lines, translations, operationTitle = null) {
	const display = buildOrderDisplay(board, lines, translations, operationTitle);
	const actionRows = buildOrderComponents(board, lines, translations, {
		full: display.full,
	});
	return buildV2Payload({
		children: display.children,
		actionRows,
		accentColor: display.accentColor,
	});
}

/**
 * @param {object} board
 * @param {Array} lines
 * @param {import('../../utils/translations.js')} translations
 * @param {{ full?: boolean, operationTitle?: string|null }} [opts]
 *        Pass `full` to avoid recomputing capacity (e.g. from buildOrderMessagePayload).
 */
function buildOrderComponents(board, lines, translations, opts = {}) {
	const boardId = String(board._id);
	const closed = board.status === 'closed';
	const list = lines || [];
	const full = opts.full != null
		? opts.full
		: isOrderBoardFull(list.length);
	const selected = resolveSelectedLine(list, board.selected_line_id);
	const selectedLineId = selected ? String(selected.line_id) : null;
	const selectedDone = selected ? isLineDone(selected) : true;
	const selectedCurrent = selected ? (Number(selected.current) || 0) : 0;
	const qtyPlusDisabled = closed || !selected || selectedDone;
	const qtyMinusDisabled = closed || !selected || selectedCurrent <= 0;
	const rows = [];

	const chunks = chunkLinesForSelects(list);
	chunks.forEach((chunk, pageIndex) => {
		const from = pageIndex * SELECT_MAX_OPTIONS + 1;
		const to = pageIndex * SELECT_MAX_OPTIONS + chunk.length;
		const selectOptions = chunk.map((line) => {
			const done = isLineDone(line);
			const isSelected = selected && String(line.line_id) === String(selected.line_id);
			const name = (line.name || '—').slice(0, 90);
			const label = (done ? `✅ ${name}` : name).slice(0, 100);
			const current = Number(line.current) || 0;
			const target = Number(line.target) || 0;
			const arrow = getPriorityArrow(line.priority);
			const marker = isSelected ? '▶️ ' : '';
			const desc = `${marker}${arrow} ${current}/${target}`.slice(0, 100);
			const opt = new StringSelectMenuOptionBuilder()
				.setLabel(label)
				.setDescription(desc)
				.setValue(String(line.line_id));
			if (isSelected) {
				opt.setDefault(true);
			}
			return opt;
		});

		const placeholder = chunks.length > 1
			? translations.translate('ORDER_SELECT_PLACEHOLDER_RANGE', { from, to })
			: translations.translate('ORDER_SELECT_PLACEHOLDER');

		rows.push(new ActionRowBuilder().addComponents(
			new StringSelectMenuBuilder()
				.setCustomId(encode('order_select', boardId, String(pageIndex)))
				.setPlaceholder(placeholder.slice(0, 150))
				.setDisabled(closed || chunk.length === 0)
				.addOptions(selectOptions),
		));
	});

	const prioLabel = selected
		? getPriorityArrow(selected.priority)
		: '➖';
	const linePart = selectedLineId || '0';

	rows.push(new ActionRowBuilder().addComponents(
		new ButtonBuilder()
			.setCustomId(encode('order_qty', 'm1', boardId, linePart))
			.setLabel('-1')
			.setStyle(ButtonStyle.Danger)
			.setDisabled(qtyMinusDisabled),
		new ButtonBuilder()
			.setCustomId(encode('order_qty', 'p1', boardId, linePart))
			.setLabel('+1')
			.setStyle(ButtonStyle.Primary)
			.setDisabled(qtyPlusDisabled),
		new ButtonBuilder()
			.setCustomId(encode('order_qty', 'p4', boardId, linePart))
			.setLabel('+4')
			.setStyle(ButtonStyle.Primary)
			.setDisabled(qtyPlusDisabled),
		new ButtonBuilder()
			.setCustomId(encode('order_qty', 'p9', boardId, linePart))
			.setLabel('+9')
			.setStyle(ButtonStyle.Success)
			.setDisabled(qtyPlusDisabled),
		new ButtonBuilder()
			.setCustomId(encode('order_qty', 'max', boardId, linePart))
			.setLabel(translations.translate('ORDER_MAX'))
			.setStyle(ButtonStyle.Success)
			.setDisabled(qtyPlusDisabled),
	));

	const closeOrReopen = closed
		? new ButtonBuilder()
			.setCustomId(encode('order_reopen', boardId))
			.setLabel(translations.translate('ORDER_REOPEN'))
			.setStyle(ButtonStyle.Success)
		: new ButtonBuilder()
			.setCustomId(encode('order_close', boardId))
			.setLabel(translations.translate('ORDER_CLOSE'))
			.setStyle(ButtonStyle.Danger);

	// Single tools row: priority · add · correct · delete · close|reopen (≤5 buttons)
	rows.push(new ActionRowBuilder().addComponents(
		new ButtonBuilder()
			.setCustomId(encode('order_priority', boardId, linePart))
			.setLabel(`${translations.translate('MATERIAL_PRIORITY')} ${prioLabel}`.slice(0, 80))
			.setStyle(ButtonStyle.Secondary)
			.setDisabled(closed || !selected),
		new ButtonBuilder()
			.setCustomId(encode('order_add', boardId))
			.setLabel(translations.translate('ORDER_ADD'))
			.setStyle(full && !closed ? ButtonStyle.Danger : ButtonStyle.Primary)
			.setDisabled(closed || full),
		new ButtonBuilder()
			.setCustomId(encode('order_correct', boardId, linePart))
			.setLabel(translations.translate('ORDER_CORRECT'))
			.setStyle(ButtonStyle.Secondary)
			.setDisabled(closed || !selected),
		new ButtonBuilder()
			.setCustomId(encode('order_delete_line', boardId, linePart))
			.setLabel(translations.translate('ORDER_DELETE_LINE'))
			.setStyle(ButtonStyle.Danger)
			.setDisabled(closed || !selected),
		closeOrReopen,
	));

	return rows;
}

module.exports = {
	MESSAGE_TYPE_BOARD,
	SELECT_MAX_OPTIONS,
	MAX_SELECT_MENUS,
	MAX_ORDER_LINES,
	ORDER_LINE_NAME_MAX,
	isLineDone,
	resolveSelectedLine,
	summarizeLines,
	formatLine,
	progressBar,
	buildMetaLines,
	buildHeaderMeta,
	buildLinesBody,
	buildSelectionContext,
	buildOrderTextParts,
	getOrderAddCapacity,
	buildOrderDisplay,
	buildOrderMessagePayload,
	buildOrderComponents,
	normalizePriority,
};
