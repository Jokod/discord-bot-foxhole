'use strict';

function stripWikiMarkup(text) {
	let s = text;
	s = s.replace(/\{\{![\s\S]*?!\}\}/g, '');
	s = s.replace(/\[\[([^|\]]+)\|([^\]]+)\]\]/g, '$2');
	s = s.replace(/\[\[([^\]]+)\]\]/g, (_, p) => p.replace(/#.*/, ''));
	s = s.replace(/''+/g, '');
	s = s.replace(/'''([^']+)'''/g, '$1');
	s = s.replace(/\{\{[^}]+\}\}/g, '');
	s = s.replace(/<[^>]+>/g, '');
	s = s.replace(/\s+/g, ' ').trim();
	return s;
}

function extractQuoteDescription(wikitext) {
	const start = wikitext.indexOf('{{Quote|');
	if (start === -1) {
		return null;
	}
	const marker = '|In-game description}}';
	const end = wikitext.indexOf(marker, start);
	if (end === -1) {
		return null;
	}
	const inner = wikitext.slice(start + '{{Quote|'.length, end);
	return inner.replace(/\s+/g, ' ').trim() || null;
}

function extractLeadDescription(wikitext) {
	let wt = wikitext.replace(/\{\{(?:Item|Vehicle|Structure) Infobox[\s\S]*?^}}\s*/gm, '');
	wt = wt.replace(/\{\{Quote\|[\s\S]*?\|In-game description\}\}/g, '');
	wt = wt.replace(/#REDIRECT\s*\[\[([^\]]+)\]\]/i, '').trim();

	const lines = wt.split('\n');
	const parts = [];
	for (const line of lines) {
		const t = line.trim();
		if (!t) {
			if (parts.length > 0) {
				break;
			}
			continue;
		}
		if (t.startsWith('{{')) {
			continue;
		}
		if (t.startsWith('==') || t.startsWith('{|') || t.startsWith('*') || t.startsWith('<')) {
			break;
		}
		if (t.startsWith('__')) {
			continue;
		}
		parts.push(t);
		if (parts.length >= 4) {
			break;
		}
	}
	const joined = parts.join(' ');
	const cleaned = stripWikiMarkup(joined);
	return cleaned.length > 20 ? cleaned : null;
}

function descriptionFromWikitext(wikitext) {
	if (!wikitext || typeof wikitext !== 'string') {
		return null;
	}
	const quote = extractQuoteDescription(wikitext);
	if (quote) {
		return quote;
	}
	return extractLeadDescription(wikitext);
}

module.exports = {
	stripWikiMarkup,
	extractQuoteDescription,
	extractLeadDescription,
	descriptionFromWikitext,
};
