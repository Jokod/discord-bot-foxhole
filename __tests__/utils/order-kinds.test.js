'use strict';

const {
	ORDER_KIND_KEYS,
	getOrderKindMeta,
	isValidOrderKind,
} = require('../../utils/order-kinds.js');

describe('order-kinds', () => {
	it('expose prod, transfer, scrap', () => {
		expect(ORDER_KIND_KEYS).toEqual(expect.arrayContaining(['prod', 'transfer', 'scrap']));
	});

	it('getOrderKindMeta fallback prod', () => {
		expect(getOrderKindMeta('scrap').i18n).toBe('ORDER_KIND_SCRAP');
		expect(getOrderKindMeta('nope').key).toBe('prod');
	});

	it('isValidOrderKind', () => {
		expect(isValidOrderKind('transfer')).toBe(true);
		expect(isValidOrderKind('scrap')).toBe(true);
		expect(isValidOrderKind('x')).toBe(false);
	});
});
