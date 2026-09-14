'use strict';

class PageCache {
	constructor() {
		/** @type {Map<string, string|null>} */
		this.wikitextByTitle = new Map();
	}

	has(title) {
		return this.wikitextByTitle.has(title);
	}

	get(title) {
		return this.wikitextByTitle.get(title);
	}

	set(title, wikitext) {
		this.wikitextByTitle.set(title, wikitext);
	}

	setMany(entries) {
		for (const [title, wikitext] of entries) {
			this.set(title, wikitext);
		}
	}

	missingTitles(titles) {
		return titles.filter((t) => !this.has(t));
	}
}

module.exports = {
	PageCache,
};
