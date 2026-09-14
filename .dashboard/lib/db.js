'use strict';

const fs = require('fs');
const path = require('path');

/**
 * Prefer the bot root mongoose install so dashboard and bot share one driver instance.
 * Fall back to a local .dashboard/node_modules copy when the root package is absent.
 */
function resolveMongoose() {
	const root = path.join(__dirname, '..', '..', 'node_modules', 'mongoose');
	const local = path.join(__dirname, '..', 'node_modules', 'mongoose');
	if (fs.existsSync(path.join(root, 'package.json'))) {
		return require(root);
	}
	if (fs.existsSync(path.join(local, 'package.json'))) {
		return require(local);
	}
	return require('mongoose');
}

module.exports = resolveMongoose();
