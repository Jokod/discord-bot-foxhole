'use strict';

const { buildV2Payload, joinBlocks } = require('./componentsV2.js');
const { safeEscapeMarkdown } = require('./markdown.js');

const OPERATION_ACCENT = {
	pending: 0xF39C12,
	started: 0x2ECC71,
	finished: 0x95A5A6,
};

const OPERATION_STATUS_KEY = {
	pending: 'OPERATION_STATUS_SCHEDULED',
	started: 'OPERATION_STATUS_LIVE',
	finished: 'OPERATION_STATUS_DONE',
};

/**
 * @param {'pending'|'started'|'finished'} status
 * @param {object} operation
 * @param {{ translate: Function }} translations
 * @param {string} [successLine] - leading success / title line
 * @param {object[]} [actionRows]
 */
function buildOperationMessagePayload(status, operation, translations, successLine, actionRows = []) {
	const statusKey = OPERATION_STATUS_KEY[status] || OPERATION_STATUS_KEY.pending;
	const accentColor = OPERATION_ACCENT[status] || OPERATION_ACCENT.pending;
	const title = operation.title
		? safeEscapeMarkdown(operation.title)
		: '—';
	const header = [
		successLine || `### ${title}`,
		`**${translations.translate(statusKey)}**`,
	].join('\n');

	const schedule = [
		`**${translations.translate('DATE')}** · ${operation.date}`,
		`**${translations.translate('HOURS')}** · ${operation.time}`,
		`**${translations.translate('DURATION')}** · ${operation.duration} min`,
	].join('\n');

	const people = `**${translations.translate('OPERATION_CREATOR')}** · <@${operation.owner_id}>`;
	const description = [
		`**${translations.translate('DESCRIPTION')}**`,
		safeEscapeMarkdown(operation.description || '—'),
	].join('\n');

	return buildV2Payload({
		children: joinBlocks([header, schedule, people, description], { break: 'large' }),
		actionRows,
		accentColor,
	});
}

module.exports = {
	OPERATION_ACCENT,
	OPERATION_STATUS_KEY,
	buildOperationMessagePayload,
};
