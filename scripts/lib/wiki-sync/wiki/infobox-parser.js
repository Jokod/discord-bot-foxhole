'use strict';

const INFOBOX_START = /^\{\{(Item|Vehicle|Structure) Infobox\b/i;

/**
 * State-machine infobox parser: scan line-by-line for opening template, fields, closing `}}`.
 * @param {string} wikitext
 * @returns {{ kind: string, fields: Record<string, string> }|null}
 */
function parseItemOrVehicleInfobox(wikitext) {
	if (!wikitext || typeof wikitext !== 'string') {
		return null;
	}

	const lines = wikitext.split('\n');
	let state = 'scan';
	let kind = null;
	const fields = {};

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i];

		if (state === 'scan') {
			const start = line.match(INFOBOX_START);
			if (!start) {
				continue;
			}
			kind = start[1];
			state = 'in_block';
			continue;
		}

		if (/^}}\s*$/.test(line)) {
			return { kind, fields };
		}
		const lm = line.match(/^\|\s*([^=]+?)\s*=\s*(.*)$/);
		if (lm) {
			fields[lm[1].trim()] = lm[2].trim();
		}
	}

	return null;
}

function extractFirstInfoboxFaction(wikitext) {
	const parsed = parseItemOrVehicleInfobox(wikitext);
	if (!parsed) {
		return null;
	}
	const raw = parsed.fields.faction;
	return raw !== undefined ? raw.trim() : null;
}

function extractInfoboxImage(wikitext) {
	const parsed = parseItemOrVehicleInfobox(wikitext);
	if (!parsed?.fields?.image) {
		return null;
	}
	let name = parsed.fields.image;
	name = name.replace(/^\[\[(?:File|Image):/i, '').replace(/\]\]$/, '').trim();
	name = name.replace(/^(?:File|Image):/i, '').trim();
	name = name.split('|')[0].trim();
	return name || null;
}

module.exports = {
	parseItemOrVehicleInfobox,
	extractFirstInfoboxFaction,
	extractInfoboxImage,
};
