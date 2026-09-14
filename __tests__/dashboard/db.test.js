'use strict';

const fs = require('fs');
const path = require('path');

describe('dashboard lib/db mongoose resolve', () => {
	afterEach(() => {
		jest.restoreAllMocks();
		jest.resetModules();
	});

	it('préfère mongoose à la racine du projet', () => {
		const mongoose = require('../../.dashboard/lib/db');
		expect(typeof mongoose.connect).toBe('function');
		const rootPkg = path.join(__dirname, '../../node_modules/mongoose/package.json');
		expect(fs.existsSync(rootPkg)).toBe(true);
	});

	it('retombe sur local puis require mongoose si racine absente', () => {
		jest.resetModules();
		const rootPkg = path.join(__dirname, '../../node_modules/mongoose/package.json');
		const localPkg = path.join(__dirname, '../../.dashboard/node_modules/mongoose/package.json');
		const realExists = fs.existsSync.bind(fs);
		jest.spyOn(fs, 'existsSync').mockImplementation((p) => {
			const s = String(p);
			if (s === rootPkg) return false;
			if (s === localPkg) return false;
			return realExists(p);
		});
		const mongoose = require('../../.dashboard/lib/db');
		expect(typeof mongoose.connect).toBe('function');
	});

	it('utilise le mongoose local quand présent et racine absente', () => {
		jest.resetModules();
		const rootPkg = path.join(__dirname, '../../node_modules/mongoose/package.json');
		const localDir = path.join(__dirname, '../../.dashboard/node_modules/mongoose');
		const localPkg = path.join(localDir, 'package.json');
		const realExists = fs.existsSync.bind(fs);
		jest.spyOn(fs, 'existsSync').mockImplementation((p) => {
			const s = String(p);
			if (s === rootPkg) return false;
			if (s === localPkg) return true;
			return realExists(p);
		});
		jest.doMock(localDir, () => ({ connect: jest.fn(), __fromLocal: true }), { virtual: true });
		const mongoose = require('../../.dashboard/lib/db');
		expect(mongoose.__fromLocal).toBe(true);
	});
});
