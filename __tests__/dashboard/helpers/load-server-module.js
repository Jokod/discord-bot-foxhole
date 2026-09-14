'use strict';

const path = require('path');

const mockConnect = jest.fn().mockResolvedValue(undefined);
const dashboardDb = path.join(__dirname, '../../../.dashboard/lib/db');

function loadServerModule() {
	let server;
	jest.isolateModules(() => {
		jest.doMock(dashboardDb, () => ({
			connect: (...args) => mockConnect(...args),
		}));
		server = require('../../../.dashboard/server.js');
	});
	return server;
}

module.exports = { loadServerModule, mockConnect };
