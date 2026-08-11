'use strict';

const {
	parseItemOrVehicleInfobox,
	descriptionFromWikitext,
	extractFirstInfoboxFaction,
	extractInfoboxImage,
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
		it('retourne null si infobox sans faction', () => {
			expect(extractFirstInfoboxFaction(itemInfobox(['| name = X']))).toBeNull();
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

		it('retourne null si Quote sans marqueur de fin', () => {
			const wt = '{{Quote|Hello only';
			expect(descriptionFromWikitext(wt)).toBeNull();
		});

		it('retourne null si lead trop court', () => {
			const wt = `${itemInfobox(['| name = X'])}

Short.
`;
			expect(descriptionFromWikitext(wt)).toBeNull();
		});

		it('ignore lignes spéciales et assemble le lead wiki', () => {
			const wt = `${itemInfobox(['| name = X'])}
{{SomeTemplate|x=y}}
__NOTOC__
[[Link|Label]] and [[Plain#anchor]] text here for lead extraction.
== Section ==
ignored
`;
			const d = descriptionFromWikitext(wt);
			expect(d).toContain('Label');
			expect(d).toContain('Plain');
		});

		it('assemble jusqu’à 4 lignes de lead', () => {
			const wt = `${itemInfobox(['| name = X'])}
First long enough line one for extraction test case here.
Second long enough line two for extraction test case here.
Third long enough line three for extraction test case here.
Fourth long enough line four for extraction test case here.
Fifth should be ignored completely.
`;
			const d = descriptionFromWikitext(wt);
			expect(d).toContain('Fourth');
			expect(d).not.toContain('Fifth');
		});

		it('s’arrête à la première ligne vide après du contenu', () => {
			const wt = `${itemInfobox(['| name = X'])}
Opening paragraph long enough for extraction to accept it as valid lead text here.

Another paragraph that should not appear in the final description output.
`;
			const d = descriptionFromWikitext(wt);
			expect(d).toContain('Opening paragraph');
			expect(d).not.toContain('Another paragraph');
		});

		it('ignore les lignes vides initiales', () => {
			const wt = `${itemInfobox(['| name = X'])}


Lead paragraph long enough for extraction to accept it as valid lead text here.
`;
			const d = descriptionFromWikitext(wt);
			expect(d).toContain('Lead paragraph');
		});

		it('continue sur lignes vides avant tout contenu (sans infobox)', () => {
			const wt = `


Lead paragraph long enough for extraction to accept it as valid lead text without infobox prefix.
`;
			const d = descriptionFromWikitext(wt);
			expect(d).toContain('without infobox prefix');
		});

		it('Quote vide après normalisation retourne null', () => {
			expect(descriptionFromWikitext('{{Quote|   |In-game description}}')).toBeNull();
		});
	});

	describe('extractInfoboxImage', () => {
		it('parse les variantes File/Image wiki', () => {
			const wt = `{{Item Infobox
| image = [[File:BasicMaterialsIcon.png]]
}}
`;
			expect(extractInfoboxImage(wt)).toBe('BasicMaterialsIcon.png');

			const pipe = `{{Vehicle Infobox
| image = File:Truck.png|thumb
}}
`;
			expect(extractInfoboxImage(pipe)).toBe('Truck.png');

			expect(extractInfoboxImage('{{Item Infobox\n| image = \n}}')).toBeNull();
			expect(extractInfoboxImage('no infobox')).toBeNull();
			expect(extractInfoboxImage(`{{Item Infobox
| image = Image:Inline.png
}}
`)).toBe('Inline.png');
			expect(extractInfoboxImage(`{{Item Infobox
| image =   
}}
`)).toBeNull();
			expect(extractInfoboxImage(`{{Item Infobox
| image = [[File:]]
}}
`)).toBeNull();
			expect(extractInfoboxImage(`{{Item Infobox
| image = |thumb
}}
`)).toBeNull();
			expect(extractInfoboxImage('{{Item Infobox\n| name = X\n}}')).toBeNull();
		});
	});
});
