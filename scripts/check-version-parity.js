#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const rootPkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const dashPkg = JSON.parse(fs.readFileSync(path.join(root, '.dashboard', 'package.json'), 'utf8'));

const rootVer = String(rootPkg.version || '');
const dashVer = String(dashPkg.version || '');

if (!rootVer || !dashVer) {
	console.error('Missing version in package.json (root or .dashboard)');
	process.exit(1);
}

if (rootVer !== dashVer) {
	console.error(
		`Version mismatch: root package.json is ${rootVer} but .dashboard/package.json is ${dashVer}. Keep them equal.`,
	);
	process.exit(1);
}

console.log(`Versions aligned: ${rootVer}`);
