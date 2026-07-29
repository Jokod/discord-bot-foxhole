const {
	EmbedBuilder,
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
const { getLineUrgency, getUrgencyColoredText } = require('../../utils/order-urgency.js');
const { getOrderKindMeta } = require('../../utils/order-kinds.js');
const {
	SELECT_MAX_OPTIONS,
	MAX_ORDER_LINES,
	MAX_SELECT_MENUS,
	chunkLinesForSelects,
	isOrderBoardFull,
} = require('../../utils/order-limits.js');

const MESSAGE_TYPE_BOARD = 'order_board';
const BOARD_FULL_COLOR = 0xE74C3C;
const EMBED_DESC_LIMIT = 4096;

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
		: (list.length > 0 && done === list.length ? 100 : 0);
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
	const urgency = getUrgencyColoredText(line, translations);
	const marker = opts.selected ? '▶️ ' : '';
	const doneBit = isLineDone(line) ? ' ✅' : '';
	const stock = translations.translate('ORDER_STOCK', { current, target });

	return `${marker}**${name}**${doneBit} — ${prio} — ${stock} — ${urgency}`;
}

/**
 * Build embed description without silently dropping lines mid-list.
 * Always keeps headers + selected line; truncates with an explicit notice.
 */
function buildDescriptionParts(board, list, translations, operationTitle, selected) {
	const closed = board.status === 'closed';
	const full = isOrderBoardFull(list.length);
	const parts = [];

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

	if (!list.length) {
		parts.push(translations.translate('ORDER_EMPTY'));
		return parts.join('\n\n').slice(0, EMBED_DESC_LIMIT);
	}

	const stats = summarizeLines(list);
	parts.push(translations.translate('ORDER_SUMMARY', {
		done: stats.done,
		total: stats.total,
		current: stats.currentSum,
		target: stats.targetSum,
		remaining: stats.remaining,
	}));

	const selectedId = selected ? String(selected.line_id) : null;
	const header = parts.join('\n\n');
	const lineTexts = list.map((line) => formatLine(line, translations, {
		selected: selectedId != null && String(line.line_id) === selectedId,
	}));

	const body = lineTexts.join('\n');
	const description = `${header}\n\n${body}`;
	if (description.length <= EMBED_DESC_LIMIT) {
		return description;
	}

	const notice = `\n\n${translations.translate('ORDER_EMBED_TRUNCATED', { count: list.length })}`;
	const budget = EMBED_DESC_LIMIT - header.length - notice.length - 2;
	const kept = [];
	let used = 0;

	if (selected) {
		const selectedText = formatLine(selected, translations, { selected: true });
		kept.push(selectedText);
		used += selectedText.length + 1;
	}

	for (const line of list) {
		if (selected && String(line.line_id) === selectedId) continue;
		const text = formatLine(line, translations, { selected: false });
		if (used + text.length + 1 > budget) break;
		kept.push(text);
		used += text.length + 1;
	}

	return `${header}\n\n${kept.join('\n')}${notice}`.slice(0, EMBED_DESC_LIMIT);
}

/**
 * @param {object} board
 * @param {Array} lines
 * @param {import('../../utils/translations.js')} translations
 * @param {string|null} [operationTitle]
 */
function buildOrderEmbed(board, lines, translations, operationTitle = null) {
	const kindMeta = getOrderKindMeta(board.kind);
	const title = `${kindMeta.emoji} ${translations.translate(kindMeta.i18n)} — ${safeEscapeMarkdown(board.name)}`;
	const closed = board.status === 'closed';
	const list = lines || [];
	const full = isOrderBoardFull(list.length);
	const selected = resolveSelectedLine(list, board.selected_line_id);
	const color = closed
		? 0x95A5A6
		: (full
			? BOARD_FULL_COLOR
			: (selected ? getPriorityEmbedColor(selected.priority) : kindMeta.color));

	const footer = translations.translate('ORDER_FOOTER', {
		lines: list.length,
		status: translations.translate(closed ? 'ORDER_STATUS_LABEL_CLOSED' : 'ORDER_STATUS_LABEL_OPEN'),
	});

	return new EmbedBuilder()
		.setColor(color)
		.setTitle(title.slice(0, 256))
		.setDescription(buildDescriptionParts(board, list, translations, operationTitle, selected))
		.setFooter({ text: footer.slice(0, 2048) });
}

/**
 * @param {object} board
 * @param {Array} lines
 * @param {import('../../utils/translations.js')} translations
 */
function buildOrderComponents(board, lines, translations) {
	const boardId = String(board._id);
	const closed = board.status === 'closed';
	const list = lines || [];
	const full = isOrderBoardFull(list.length);
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
			const label = (line.name || '—').slice(0, 100);
			const current = Number(line.current) || 0;
			const target = Number(line.target) || 0;
			const arrow = getPriorityArrow(line.priority);
			const desc = `${arrow} ${current}/${target}`.slice(0, 100);
			const opt = new StringSelectMenuOptionBuilder()
				.setLabel(label)
				.setDescription(desc)
				.setValue(String(line.line_id));
			if (selected && String(line.line_id) === String(selected.line_id)) {
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
				.setDisabled(closed)
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
	));

	rows.push(new ActionRowBuilder().addComponents(
		closed
			? new ButtonBuilder()
				.setCustomId(encode('order_reopen', boardId))
				.setLabel(translations.translate('ORDER_REOPEN'))
				.setStyle(ButtonStyle.Success)
			: new ButtonBuilder()
				.setCustomId(encode('order_close', boardId))
				.setLabel(translations.translate('ORDER_CLOSE'))
				.setStyle(ButtonStyle.Danger),
	));

	return rows;
}

module.exports = {
	MESSAGE_TYPE_BOARD,
	SELECT_MAX_OPTIONS,
	MAX_SELECT_MENUS,
	MAX_ORDER_LINES,
	isLineDone,
	resolveSelectedLine,
	summarizeLines,
	formatLine,
	buildOrderEmbed,
	buildOrderComponents,
	normalizePriority,
	getLineUrgency,
};
