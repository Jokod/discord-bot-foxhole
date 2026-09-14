'use strict';

const pruneList = require('./overrides/prune.json');
const rehomeMap = require('./overrides/rehome.json');
const titleOverrides = require('./overrides/titles.json');
const scan = require('./scan');
const api = require('./api');
const { RESOURCE_NAME_TO_REL } = require('./routing/rules');

const PRUNE_CATALOG_ITEM_NAMES = new Set(pruneList);
const ITEM_REHOME_TO_REL = new Map(Object.entries(rehomeMap));
const WIKI_TITLE_OVERRIDES = titleOverrides;

module.exports = {
	...api,
	...scan,
	PRUNE_CATALOG_ITEM_NAMES,
	ITEM_REHOME_TO_REL,
	WIKI_TITLE_OVERRIDES,
	WIKI_ICON_PAGE_OVERRIDES: scan.WIKI_ICON_PAGE_OVERRIDES,
	RESOURCE_NAME_TO_REL,
};
