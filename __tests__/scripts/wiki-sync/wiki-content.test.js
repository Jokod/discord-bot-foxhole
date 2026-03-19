'use strict';

const {
	parseItemOrVehicleInfobox,
	descriptionFromWikitext,
	extractFirstInfoboxFaction,
} = require('../../../scripts/lib/wiki-sync/wiki-content');

function itemInfobox(lines) {
	return `{{Item Infobox
${lines.join('\n')}
}}
`;
}

describe('wiki-sync / wiki-content', () => {
	describe('parseItemOrVehicleInfobox', () => {
		it('retourne null si pas d’infobox', () => {
			expect(parseItemOrVehicleInfobox('Pas d’infobox ici.')).toBeNull();
			expect(parseItemOrVehicleInfobox(null)).toBeNull();
		});
		it('parse un Item Infobox et les champs', () => {
			const wt = itemInfobox([
				'| name                              = Test Rifle',
				'| category                          = Small Arms',
				'| ItemProfileType                   = LightAmmo',
			]);
			const p = parseItemOrVehicleInfobox(wt);
			expect(p.kind).toBe('Item');
			expect(p.fields.name).toBe('Test Rifle');
			expect(p.fields.category).toBe('Small Arms');
			expect(p.fields.ItemProfileType).toBe('LightAmmo');
		});
		it('parse Vehicle Infobox', () => {
			const wt = `{{Vehicle Infobox
| name = Truck
}}
`;
			const p = parseItemOrVehicleInfobox(wt);
			expect(p.kind).toBe('Vehicle');
			expect(p.fields.name).toBe('Truck');
		});
	});

	describe('extractFirstInfoboxFaction', () => {
		it('extrait faction = …', () => {
			const wt = itemInfobox([
				'| name = X',
				'| faction                           = Col',
			]);
			expect(extractFirstInfoboxFaction(wt)).toBe('Col');
		});
		it('retourne null sans infobox', () => {
			expect(extractFirstInfoboxFaction('foo')).toBeNull();
		});
	});

	describe('descriptionFromWikitext', () => {
		it('privilégie {{Quote|…|In-game description}}', () => {
			const wt = `${itemInfobox(['| name = X'])}
{{Quote|Hello from game|In-game description}}
`;
			expect(descriptionFromWikitext(wt)).toBe('Hello from game');
		});
		it('retourne null pour entrée invalide', () => {
			expect(descriptionFromWikitext(null)).toBeNull();
		});
		it('utilise le lead si pas de Quote', () => {
			const wt = `${itemInfobox(['| name = X'])}

This is a long enough lead paragraph for the extractor to accept it as description text without being too short.
`;
			const d = descriptionFromWikitext(wt);
			expect(d).toBeTruthy();
			expect(d.length).toBeGreaterThan(20);
			expect(d).toMatch(/long enough lead/i);
		});
	});
});
