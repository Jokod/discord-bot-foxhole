'use strict';

/**
 * Fail if language files drift from English keys.
 *   node scripts/check-i18n-parity.js
 */
const fs = require('fs');
const path = require('path');

const en = require('../languages/en.js');
const langs = {
	fr: require('../languages/fr.js'),
	ru: require('../languages/ru.js'),
	'zh-cn': require('../languages/zh-cn.js'),
};

const enKeys = Object.keys(en).sort();
let failed = false;

for (const [name, lang] of Object.entries(langs)) {
	const keys = Object.keys(lang);
	const missing = enKeys.filter((k) => !(k in lang));
	const extra = keys.filter((k) => !(k in en));
	if (missing.length || extra.length) {
		failed = true;
		console.error(`[i18n] ${name}: missing=${missing.length} extra=${extra.length}`);
		if (missing.length) console.error('  missing:', missing.slice(0, 30).join(', '));
		if (extra.length) console.error('  extra:', extra.slice(0, 30).join(', '));
	}
	else {
		console.log(`[i18n] ${name}: OK (${keys.length} keys)`);
	}
}

const orderKeys = enKeys.filter((k) => k.startsWith('ORDER_'));
if (orderKeys.length < 20) {
	failed = true;
	console.error(`[i18n] Expected ORDER_* keys (>=20), found ${orderKeys.length}`);
}
else {
	console.log(`[i18n] ORDER_* keys: ${orderKeys.length}`);
}

const dashDir = path.join(__dirname, '../.dashboard/i18n');
const dashEn = JSON.parse(fs.readFileSync(path.join(dashDir, 'en.json'), 'utf8'));
const dashEnKeys = Object.keys(dashEn).sort();

for (const file of ['fr.json', 'ru.json', 'zh-CN.json']) {
	const loc = JSON.parse(fs.readFileSync(path.join(dashDir, file), 'utf8'));
	const keys = Object.keys(loc);
	const missing = dashEnKeys.filter((k) => !(k in loc));
	const extra = keys.filter((k) => !(k in dashEn));
	if (missing.length || extra.length) {
		failed = true;
		console.error(`[dashboard-i18n] ${file}: missing=${missing.length} extra=${extra.length}`);
		if (missing.length) console.error('  missing:', missing.slice(0, 30).join(', '));
		if (extra.length) console.error('  extra:', extra.slice(0, 30).join(', '));
	}
	else {
		console.log(`[dashboard-i18n] ${file}: OK (${keys.length} keys)`);
	}
}

if (failed) process.exit(1);
console.log('[i18n] Parity check passed.');
