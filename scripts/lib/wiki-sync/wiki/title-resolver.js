'use strict';

const { WIKI_TITLE_OVERRIDES, WIKI_ICON_PAGE_OVERRIDES } = require('../config');
const { sleep } = require('./rate-limiter');

function asciiQuotesToCurly(name) {
	let out = '';
	let open = true;
	for (let i = 0; i < name.length; i++) {
		const ch = name[i];
		if (ch === '"') {
			out += open ? '\u201c' : '\u201d';
			open = !open;
		}
		else {
			out += ch;
		}
	}
	return out;
}

function inferWikiTitle(itemName) {
	if (Object.prototype.hasOwnProperty.call(WIKI_TITLE_OVERRIDES, itemName)) {
		return WIKI_TITLE_OVERRIDES[itemName];
	}
	if (itemName === 'Malone Ratcatcher') {
		return 'Malone Ratcatcher MK.1';
	}
	if (itemName === 'The Osprey') {
		return 'The Ospreay';
	}
	if (itemName.endsWith(' Ammo Crate')) {
		return itemName.slice(0, -' Ammo Crate'.length);
	}
	const shell = itemName.match(/^(\d+(?:\.\d+)?mm) Shell$/);
	if (shell) {
		return shell[1];
	}

	let t = itemName.replace(/\u2019/g, '\'').replace(/\u2018/g, '\'');
	if (/^O'Brien\b/i.test(t)) {
		t = t.replace(/\bv\./g, 'V.');
	}
	t = t.replace(/\bMk\.(\d)/gi, 'MK.$1');
	if (t.includes('"')) {
		t = asciiQuotesToCurly(t);
	}
	if (t === '90T-v Nemesis') {
		t = '90T-v \u201cNemesis\u201d';
	}
	return t;
}

function resolveWikiTitle(requestedTitle, query) {
	let cur = requestedTitle;
	let changed = true;
	while (changed) {
		changed = false;
		for (const n of query.normalized || []) {
			if (n.from === cur) {
				cur = n.to;
				changed = true;
				break;
			}
		}
		for (const r of query.redirects || []) {
			if (r.from === cur) {
				cur = r.to;
				changed = true;
				break;
			}
		}
	}
	return cur;
}

function resolveIconWikiTitle(itemName) {
	if (Object.prototype.hasOwnProperty.call(WIKI_ICON_PAGE_OVERRIDES, itemName)) {
		return WIKI_ICON_PAGE_OVERRIDES[itemName];
	}
	return inferWikiTitle(itemName);
}

function isFrenchUniformEntry(material) {
	return material.itemName.startsWith('Uniforme ');
}

function wikiFactionToArray(raw) {
	const v = (raw || '').trim();
	const lower = v.toLowerCase();
	if (lower === 'both' || lower === 'all') {
		return ['colonial', 'warden'];
	}
	if (lower === 'col' || lower === 'colonial') {
		return ['colonial'];
	}
	if (lower === 'war' || lower === 'warden') {
		return ['warden'];
	}
	return null;
}

function canonicalInfoboxNameForCatalog(name) {
	const t = (name || '').trim();
	if (t === 'AP/RPG') {
		return 'AP\u29F8RPG';
	}
	if (t === 'ARC/RPG') {
		return 'ARC\u29F8RPG';
	}
	return t;
}

module.exports = {
	sleep,
	isFrenchUniformEntry,
	asciiQuotesToCurly,
	inferWikiTitle,
	resolveWikiTitle,
	resolveIconWikiTitle,
	wikiFactionToArray,
	canonicalInfoboxNameForCatalog,
};
