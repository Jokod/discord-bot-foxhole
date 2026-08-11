'use strict';

describe('shared/permissions', () => {
	it('re-exporte utils/order-permissions', () => {
		const shared = require('../../shared/permissions.js');
		const utils = require('../../utils/order-permissions.js');
		expect(shared).toBe(utils);
		expect(typeof shared.canManageBoard).toBe('function');
		expect(typeof shared.canManageLine).toBe('function');
	});
});
