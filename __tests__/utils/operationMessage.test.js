'use strict';

const {
	buildOperationMessagePayload,
	OPERATION_ACCENT,
	OPERATION_STATUS_KEY,
} = require('../../utils/operationMessage.js');
const { getV2Text, getV2AccentColor } = require('../helpers/v2Payload.js');

const translations = {
	translate: (key) => key,
};

describe('operationMessage', () => {
	const operation = {
		title: 'Raid',
		owner_id: 'u1',
		date: 'd',
		time: 't',
		duration: 60,
		description: 'Go',
	};

	it('builds pending/started/finished with accents and status keys', () => {
		const pending = buildOperationMessagePayload('pending', operation, translations, 'CREATED');
		expect(getV2Text(pending)).toContain('OPERATION_STATUS_SCHEDULED');
		expect(getV2AccentColor(pending)).toBe(OPERATION_ACCENT.pending);

		const started = buildOperationMessagePayload('started', operation, translations, 'LIVE');
		expect(getV2Text(started)).toContain('OPERATION_STATUS_LIVE');
		expect(getV2AccentColor(started)).toBe(OPERATION_ACCENT.started);

		const finished = buildOperationMessagePayload('finished', operation, translations, 'DONE');
		expect(getV2Text(finished)).toContain('OPERATION_STATUS_DONE');
		expect(getV2AccentColor(finished)).toBe(OPERATION_ACCENT.finished);
	});

	it('falls back for unknown status, missing title/description, no successLine', () => {
		const payload = buildOperationMessagePayload('weird', {
			owner_id: 'u1',
			date: 'd',
			time: 't',
			duration: 1,
		}, translations);
		expect(getV2Text(payload)).toContain('OPERATION_STATUS_SCHEDULED');
		expect(getV2Text(payload)).toContain('—');
		expect(getV2AccentColor(payload)).toBe(OPERATION_ACCENT.pending);
		expect(OPERATION_STATUS_KEY.pending).toBe('OPERATION_STATUS_SCHEDULED');
	});
});
