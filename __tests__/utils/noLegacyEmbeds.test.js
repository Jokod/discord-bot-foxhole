'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '../..');
const SCAN_DIRS = ['interactions', 'events', 'utils', 'messages', 'shared', 'scripts'];
const FORBIDDEN = ['new EmbedBuilder', 'embeds: ['];

/**
 * @param {string} dir
 * @returns {string[]}
 */
function walkJsFiles(dir) {
	const abs = path.join(ROOT, dir);
	if (!fs.existsSync(abs)) return [];
	/** @type {string[]} */
	const out = [];
	const stack = [abs];
	while (stack.length) {
		const cur = stack.pop();
		for (const name of fs.readdirSync(cur)) {
			const full = path.join(cur, name);
			const st = fs.statSync(full);
			if (st.isDirectory()) {
				if (name === 'node_modules' || name === '__tests__' || name === 'coverage') continue;
				stack.push(full);
			}
			else if (st.isFile() && name.endsWith('.js')) {
				out.push(full);
			}
		}
	}
	return out;
}

describe('no legacy embeds in production', () => {
	it('ne contient ni new EmbedBuilder ni embeds: [', () => {
		const files = SCAN_DIRS.flatMap(walkJsFiles);
		expect(files.length).toBeGreaterThan(0);

		/** @type {string[]} */
		const violations = [];
		for (const file of files) {
			const src = fs.readFileSync(file, 'utf8');
			for (const needle of FORBIDDEN) {
				if (src.includes(needle)) {
					violations.push(`${path.relative(ROOT, file)}: ${needle}`);
				}
			}
		}

		expect(violations).toEqual([]);
	});
});
