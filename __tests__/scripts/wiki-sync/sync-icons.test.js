'use strict';

jest.mock('../../../scripts/lib/wiki-sync/config', () => ({
	BATCH_SIZE: 1,
	BATCH_DELAY_MS: 0,
	WIKI_API: 'https://foxhole.wiki.gg/api.php',
	USER_AGENT: 'FoxBot/1.0 (test)',
	WIKI_ICON_PAGE_OVERRIDES: {
		'Soldier Uniform': 'Legionary Fatigues',
	},
}));

jest.mock('../../../scripts/lib/wiki-sync/wiki-helpers', () => ({
	sleep: jest.fn(async () => undefined),
	isFrenchUniformEntry: jest.fn((m) => m.itemName === 'FR Uniform'),
	inferWikiTitle: jest.fn((name) => name),
}));

const fs = require('fs');
const os = require('os');
const path = require('path');
const { sleep } = require('../../../scripts/lib/wiki-sync/wiki-helpers');
const {
	safeIconFilename,
	isAllowedIconUrl,
	detectImageKind,
	extensionMatchesKind,
	fetchImageInfoUrls,
	runSyncMaterialIcons,
	downloadBinary,
	MAX_ICON_BYTES,
	catalogItemNames,
	resolveIconWikiTitle,
} = require('../../../scripts/lib/wiki-sync/sync-icons');
const { extractInfoboxImage } = require('../../../scripts/lib/wiki-sync/wiki-content');

const PNG_1X1 = Buffer.from(
	'89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c489'
	+ '0000000a49444154789c63000100000500010d0a2db40000000049454e44ae426082',
	'hex',
);

const JPEG_HDR = Buffer.from([
	0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
	0x01, 0x00, 0x01, 0x00, 0x01, 0x00, 0xff, 0xdb, 0x00, 0x43, 0x00,
]);

const GIF_12 = Buffer.concat([Buffer.from('GIF89a'), Buffer.alloc(6)]);

const WEBP_12 = Buffer.alloc(12);
WEBP_12.write('RIFF', 0);
WEBP_12.write('WEBP', 8);

const ALLOWED_URL = 'https://foxhole.wiki.gg/images/x.png';

function mkFetchResponse({
	ok = true,
	status = 200,
	contentType = 'image/png',
	contentLength = null,
	body = PNG_1X1,
} = {}) {
	return {
		ok,
		status,
		headers: {
			get: (h) => {
				const key = String(h).toLowerCase();
				if (key === 'content-type') return contentType;
				if (key === 'content-length') {
					return contentLength == null ? null : String(contentLength);
				}
				return null;
			},
		},
		arrayBuffer: async () => body.buffer.slice(body.byteOffset, body.byteOffset + body.byteLength),
	};
}

function writeMaterialsFixture(materialsRoot, materials) {
	fs.mkdirSync(path.join(materialsRoot, 'resources'), { recursive: true });
	fs.writeFileSync(
		path.join(materialsRoot, 'resources', 'bmat.json'),
		JSON.stringify(materials),
	);
}

describe('wiki-sync / sync-icons', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('safeIconFilename rejects traversal and non-images', () => {
		expect(safeIconFilename('BasicMaterialsIcon.png')).toBe('BasicMaterialsIcon.png');
		expect(safeIconFilename('../x.png')).toBeNull();
		expect(safeIconFilename('foo.txt')).toBeNull();
		expect(safeIconFilename('')).toBeNull();
		expect(safeIconFilename('bad\\name.png')).toBeNull();
	});

	it('safeIconFilename null quand basename diffère du raw', () => {
		const basenameSpy = jest.spyOn(path, 'basename').mockReturnValue('Other.png');
		expect(safeIconFilename('BasicMaterialsIcon.png')).toBeNull();
		basenameSpy.mockRestore();
	});

	it('canonicalIconFilename remplace les espaces par des underscores', () => {
		const { canonicalIconFilename, mediaWikiFileKey } = require('../../../scripts/lib/wiki-sync/sync-icons');
		expect(canonicalIconFilename('74c-2 Ronan Meteora Gunship Vehicle Icon.png'))
			.toBe('74c-2_Ronan_Meteora_Gunship_Vehicle_Icon.png');
		expect(canonicalIconFilename('../x.png')).toBeNull();
		expect(mediaWikiFileKey('File Name.png')).toBe('File_Name.png');
		expect(mediaWikiFileKey(null)).toBe('');
		expect(mediaWikiFileKey(undefined)).toBe('');
	});

	it('isAllowedIconUrl restreint https + hôte + /images/', () => {
		expect(isAllowedIconUrl('https://foxhole.wiki.gg/images/BasicMaterialsIcon.png')).toBe(true);
		expect(isAllowedIconUrl('https://foxhole.wiki.gg/images/BasicMaterialsIcon.png?b246f1')).toBe(true);
		expect(isAllowedIconUrl('http://foxhole.wiki.gg/images/x.png')).toBe(false);
		expect(isAllowedIconUrl('https://evil.example/images/x.png')).toBe(false);
		expect(isAllowedIconUrl('https://foxhole.wiki.gg/wiki/File:x.png')).toBe(false);
		expect(isAllowedIconUrl('https://user:pass@foxhole.wiki.gg/images/x.png')).toBe(false);
	});

	it('isAllowedIconUrl false sur chaîne URL invalide', () => {
		expect(isAllowedIconUrl('not-a-url')).toBe(false);
		expect(isAllowedIconUrl('')).toBe(false);
		expect(isAllowedIconUrl(null)).toBe(false);
	});

	it('resolveIconWikiTitle applique WIKI_ICON_PAGE_OVERRIDES', () => {
		expect(resolveIconWikiTitle('Soldier Uniform')).toBe('Legionary Fatigues');
		expect(resolveIconWikiTitle('Basic Materials')).toBe('Basic Materials');
	});

	it('detectImageKind reconnaît PNG, JPEG, GIF et WebP', () => {
		expect(detectImageKind(PNG_1X1)).toBe('png');
		expect(detectImageKind(JPEG_HDR)).toBe('jpeg');
		expect(detectImageKind(GIF_12)).toBe('gif');
		expect(detectImageKind(WEBP_12)).toBe('webp');
		expect(detectImageKind(Buffer.from('not-an-image'))).toBeNull();
		expect(detectImageKind(Buffer.alloc(8))).toBeNull();
	});

	it('extensionMatchesKind valide les paires extension / kind', () => {
		expect(extensionMatchesKind('x.png', 'png')).toBe(true);
		expect(extensionMatchesKind('x.jpg', 'jpeg')).toBe(true);
		expect(extensionMatchesKind('x.jpeg', 'jpeg')).toBe(true);
		expect(extensionMatchesKind('x.gif', 'gif')).toBe(true);
		expect(extensionMatchesKind('x.webp', 'webp')).toBe(true);
		expect(extensionMatchesKind('x.png', 'jpeg')).toBe(false);
		expect(extensionMatchesKind('x.png', 'unknown')).toBe(false);
	});

	it('extractInfoboxImage lit le champ image', () => {
		const wt = `{{Item Infobox
| name = Basic Materials
| image = BasicMaterialsIcon.png
}}
`;
		expect(extractInfoboxImage(wt)).toBe('BasicMaterialsIcon.png');
		expect(extractInfoboxImage('nope')).toBeNull();
	});

	it('extractInfoboxImage lit Structure Infobox', () => {
		const wt = `{{Structure Infobox
| name = DAE 5b “Zeal”
| image = EmplacedAntiAircraftStructureIcon.png
}}
`;
		expect(extractInfoboxImage(wt)).toBe('EmplacedAntiAircraftStructureIcon.png');
	});

	it('fetchImageInfoUrls lève sur erreur API', async () => {
		const fetchImpl = jest.fn(async () => ({
			ok: true,
			json: async () => ({ error: { code: 'bad', info: 'fail' } }),
		}));
		await expect(fetchImageInfoUrls(['a.png'], { fetchImpl })).rejects.toThrow(/API imageinfo: bad/);
	});

	it('fetchImageInfoUrls dort entre les lots', async () => {
		const fetchImpl = jest.fn(async () => ({
			ok: true,
			json: async () => ({
				query: {
					pages: {
						1: {
							title: 'File:a.png',
							imageinfo: [{ url: 'https://foxhole.wiki.gg/images/a.png' }],
						},
					},
				},
			}),
		}));
		await fetchImageInfoUrls(['a.png', 'b.png'], { fetchImpl });
		expect(fetchImpl).toHaveBeenCalledTimes(2);
		expect(sleep).toHaveBeenCalledTimes(1);
	});

	it('downloadBinary refuse URL / magic invalides', async () => {
		const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'icon-dl-'));
		const dest = path.join(tmp, 'x.png');
		await expect(downloadBinary('https://evil.example/images/x.png', dest, {
			fetchImpl: jest.fn(),
		})).rejects.toThrow(/refusée/);

		const fetchImpl = jest.fn(async () => mkFetchResponse({
			body: Buffer.from('MZ-executable-not-png'),
		}));
		await expect(downloadBinary(ALLOWED_URL, dest, {
			fetchImpl,
			expectedName: 'x.png',
		})).rejects.toThrow(/Magic bytes/);

		fs.rmSync(tmp, { recursive: true, force: true });
	});

	it('downloadBinary lève sur HTTP non ok', async () => {
		const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'icon-dl-'));
		const dest = path.join(tmp, 'x.png');
		const fetchImpl = jest.fn(async () => mkFetchResponse({ ok: false, status: 404 }));
		await expect(downloadBinary(ALLOWED_URL, dest, { fetchImpl })).rejects.toThrow(/HTTP 404/);
		fs.rmSync(tmp, { recursive: true, force: true });
	});

	it('downloadBinary lève sur Content-Type non image', async () => {
		const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'icon-dl-'));
		const dest = path.join(tmp, 'x.png');
		const fetchImpl = jest.fn(async () => mkFetchResponse({ contentType: 'text/html' }));
		await expect(downloadBinary(ALLOWED_URL, dest, { fetchImpl })).rejects.toThrow(/Content-Type non image/);
		fs.rmSync(tmp, { recursive: true, force: true });
	});

	it('downloadBinary lève si Content-Length trop grand', async () => {
		const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'icon-dl-'));
		const dest = path.join(tmp, 'x.png');
		const fetchImpl = jest.fn(async () => mkFetchResponse({
			contentLength: MAX_ICON_BYTES + 1,
		}));
		await expect(downloadBinary(ALLOWED_URL, dest, { fetchImpl })).rejects.toThrow(/trop volumineux/);
		fs.rmSync(tmp, { recursive: true, force: true });
	});

	it('downloadBinary lève si buffer trop grand ou vide', async () => {
		const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'icon-dl-'));
		const dest = path.join(tmp, 'x.png');
		const huge = Buffer.alloc(MAX_ICON_BYTES + 1, 0x89);
		huge[0] = 0x89;
		huge[1] = 0x50;
		huge[2] = 0x4e;
		huge[3] = 0x47;
		const fetchHuge = jest.fn(async () => mkFetchResponse({ body: huge }));
		await expect(downloadBinary(ALLOWED_URL, dest, {
			fetchImpl: fetchHuge,
			expectedName: 'x.png',
		})).rejects.toThrow(/Taille invalide/);

		const fetchEmpty = jest.fn(async () => mkFetchResponse({ body: Buffer.alloc(0) }));
		await expect(downloadBinary(ALLOWED_URL, dest, { fetchImpl: fetchEmpty })).rejects.toThrow(/Taille invalide/);
		fs.rmSync(tmp, { recursive: true, force: true });
	});

	it('downloadBinary lève si extension incompatible avec le kind', async () => {
		const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'icon-dl-'));
		const dest = path.join(tmp, 'x.jpg');
		const fetchImpl = jest.fn(async () => mkFetchResponse());
		await expect(downloadBinary(ALLOWED_URL, dest, {
			fetchImpl,
			expectedName: 'x.jpg',
		})).rejects.toThrow(/Extension .* incompatible avec png/);
		fs.rmSync(tmp, { recursive: true, force: true });
	});

	it('runSyncMaterialIcons dry-run écrit le manifest et skippe le disque images', async () => {
		const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'sync-icons-'));
		const materialsRoot = path.join(tmp, 'materials');
		const iconsDir = path.join(tmp, 'icons');
		writeMaterialsFixture(materialsRoot, [{
			faction: ['colonial', 'warden'],
			itemName: 'Basic Materials',
			itemDesc: 'test',
			itemCategory: 'resources',
		}]);

		const logs = [];
		const silent = () => undefined;
		const fetchImpl = jest.fn(async (url) => {
			const u = String(url);
			if (u.includes('imageinfo')) {
				return {
					ok: true,
					json: async () => ({
						query: {
							pages: {
								1: {
									title: 'File:BasicMaterialsIcon.png',
									imageinfo: [{ url: 'https://foxhole.wiki.gg/images/BasicMaterialsIcon.png' }],
								},
							},
						},
					}),
				};
			}
			return mkFetchResponse();
		});

		const fetchWikitext = jest.fn(async () => {
			const map = new Map();
			map.set('Basic Materials', `{{Item Infobox
| name = Basic Materials
| image = BasicMaterialsIcon.png
}}
`);
			return map;
		});

		const result = await runSyncMaterialIcons({
			materialsRoot,
			iconsDir,
			dryRun: true,
			fetchImpl,
			fetchWikitext,
			log: (m) => logs.push(m),
		});

		expect(result.downloaded).toBe(1);
		expect(result.manifest['Basic Materials']).toBe('BasicMaterialsIcon.png');
		expect(fs.existsSync(path.join(iconsDir, 'BasicMaterialsIcon.png'))).toBe(false);
		expect(fs.existsSync(path.join(iconsDir, 'manifest.json'))).toBe(false);
		expect(logs.some((l) => l.includes('[dry]'))).toBe(true);

		const written = await runSyncMaterialIcons({
			materialsRoot,
			iconsDir,
			dryRun: false,
			fetchImpl,
			fetchWikitext,
			log: silent,
		});
		expect(written.downloaded).toBe(1);
		expect(fs.existsSync(path.join(iconsDir, 'BasicMaterialsIcon.png'))).toBe(true);
		expect(detectImageKind(fs.readFileSync(path.join(iconsDir, 'BasicMaterialsIcon.png')))).toBe('png');
		expect(JSON.parse(fs.readFileSync(path.join(iconsDir, 'manifest.json'), 'utf8'))['Basic Materials'])
			.toBe('BasicMaterialsIcon.png');

		const skipped = await runSyncMaterialIcons({
			materialsRoot,
			iconsDir,
			dryRun: false,
			force: false,
			fetchImpl,
			fetchWikitext,
			log: silent,
		});
		expect(skipped.skippedExisting).toBe(1);
		expect(skipped.downloaded).toBe(0);

		fs.rmSync(tmp, { recursive: true, force: true });
	});

	it('runSyncMaterialIcons compte pages manquantes, image absente et filename unsafe', async () => {
		const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'sync-icons-'));
		const materialsRoot = path.join(tmp, 'materials');
		const iconsDir = path.join(tmp, 'icons');
		writeMaterialsFixture(materialsRoot, [
			{ itemName: 'Missing Page', itemDesc: 'a', itemCategory: 'resources' },
			{ itemName: 'No Image', itemDesc: 'b', itemCategory: 'resources' },
			{ itemName: 'Unsafe Image', itemDesc: 'c', itemCategory: 'resources' },
		]);

		const fetchWikitext = jest.fn(async () => new Map([
			['No Image', `{{Item Infobox
| name = No Image
}}
`],
			['Unsafe Image', `{{Item Infobox
| name = Unsafe Image
| image = ../evil.png
}}
`],
		]));

		const logs = [];
		const result = await runSyncMaterialIcons({
			materialsRoot,
			iconsDir,
			dryRun: true,
			fetchImpl: jest.fn(),
			fetchWikitext,
			log: (m) => logs.push(m),
		});

		expect(result.missingPages).toEqual([{ itemName: 'Missing Page', wikiTitle: 'Missing Page' }]);
		expect(result.missingImage).toEqual(expect.arrayContaining([
			{ itemName: 'No Image', wikiTitle: 'No Image' },
			{ itemName: 'Unsafe Image', wikiTitle: 'Unsafe Image', image: '../evil.png' },
		]));
		expect(result.downloaded).toBe(0);
		expect(logs.some((l) => l.includes('Pages wiki manquantes'))).toBe(true);
		expect(logs.some((l) => l.includes('Sans champ image infobox'))).toBe(true);

		fs.rmSync(tmp, { recursive: true, force: true });
	});

	it('runSyncMaterialIcons incrémente failed sans URL imageinfo ou download en erreur', async () => {
		const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'sync-icons-'));
		const materialsRoot = path.join(tmp, 'materials');
		const iconsDir = path.join(tmp, 'icons');
		writeMaterialsFixture(materialsRoot, [
			{ itemName: 'No Url Item', itemDesc: 'a', itemCategory: 'resources' },
			{ itemName: 'Download Fail', itemDesc: 'b', itemCategory: 'resources' },
		]);

		const fetchWikitext = jest.fn(async () => new Map([
			['No Url Item', `{{Item Infobox
| name = No Url Item
| image = NoUrl.png
}}
`],
			['Download Fail', `{{Item Infobox
| name = Download Fail
| image = Fail.png
}}
`],
		]));

		const logs = [];
		const fetchImpl = jest.fn(async (url) => {
			const u = String(url);
			if (u.includes('imageinfo')) {
				return {
					ok: true,
					json: async () => ({
						query: {
							pages: {
								1: { title: 'File:NoUrl.png' },
								2: {
									title: 'File:Fail.png',
									imageinfo: [{ url: 'https://foxhole.wiki.gg/images/Fail.png' }],
								},
							},
						},
					}),
				};
			}
			throw new Error('network down');
		});

		const result = await runSyncMaterialIcons({
			materialsRoot,
			iconsDir,
			dryRun: false,
			fetchImpl,
			fetchWikitext,
			log: (m) => logs.push(m),
		});

		expect(result.failed).toBe(2);
		expect(result.downloaded).toBe(0);
		expect(logs.some((l) => l.includes('[skip] pas d’URL imageinfo pour NoUrl.png'))).toBe(true);
		expect(logs.some((l) => l.includes('[err] Fail.png: network down'))).toBe(true);
		expect(fs.existsSync(path.join(iconsDir, 'Fail.png'))).toBe(false);

		fs.rmSync(tmp, { recursive: true, force: true });
	});

	it('runSyncMaterialIcons logue sur stderr par défaut si log omis', async () => {
		const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'sync-icons-'));
		const materialsRoot = path.join(tmp, 'materials');
		const iconsDir = path.join(tmp, 'icons');
		writeMaterialsFixture(materialsRoot, [{
			itemName: 'Basic Materials',
			itemDesc: 'test',
			itemCategory: 'resources',
		}]);

		const fetchWikitext = jest.fn(async () => new Map([
			['Basic Materials', `{{Item Infobox
| name = Basic Materials
| image = BasicMaterialsIcon.png
}}
`],
		]));
		const fetchImpl = jest.fn(async (url) => {
			if (String(url).includes('imageinfo')) {
				return {
					ok: true,
					json: async () => ({
						query: {
							pages: {
								1: {
									title: 'File:BasicMaterialsIcon.png',
									imageinfo: [{ url: 'https://foxhole.wiki.gg/images/BasicMaterialsIcon.png' }],
								},
							},
						},
					}),
				};
			}
			return mkFetchResponse();
		});

		const stderr = jest.spyOn(process.stderr, 'write').mockImplementation(() => true);
		await runSyncMaterialIcons({
			materialsRoot,
			iconsDir,
			dryRun: true,
			fetchImpl,
			fetchWikitext,
		});

		expect(stderr).toHaveBeenCalledWith(expect.stringContaining('Lot wiki'));
		stderr.mockRestore();
		fs.rmSync(tmp, { recursive: true, force: true });
	});

	it('fetchImageInfoUrls retourne vide et ignore pages invalides', async () => {
		expect(await fetchImageInfoUrls([], { fetchImpl: jest.fn() })).toEqual(new Map());
		const fetchImpl = jest.fn(async () => ({
			ok: true,
			json: async () => ({
				query: {
					pages: {
						1: { title: 'File:Missing.png', missing: true },
						2: {
							title: 'File:BadUrl.png',
							imageinfo: [{ url: 'https://evil.example/images/x.png' }],
						},
					},
				},
			}),
		}));
		const map = await fetchImageInfoUrls(['Missing.png', 'BadUrl.png'], { fetchImpl });
		expect(map.size).toBe(0);
	});

	it('downloadBinary accepte une réponse sans Content-Type', async () => {
		const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'icon-dl-'));
		const dest = path.join(tmp, 'x.png');
		const fetchImpl = jest.fn(async () => ({
			ok: true,
			status: 200,
			headers: { get: () => null },
			arrayBuffer: async () => PNG_1X1.buffer.slice(PNG_1X1.byteOffset, PNG_1X1.byteOffset + PNG_1X1.byteLength),
		}));
		await downloadBinary(ALLOWED_URL, dest, { fetchImpl, expectedName: 'x.png' });
		expect(fs.existsSync(dest)).toBe(true);
		fs.rmSync(tmp, { recursive: true, force: true });
	});

	it('catalogItemNames ignore les uniforms FR', () => {
		const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'sync-icons-'));
		const materialsRoot = path.join(tmp, 'materials');
		writeMaterialsFixture(materialsRoot, [
			{ itemName: 'FR Uniform', itemDesc: 'fr', itemCategory: 'utilities' },
			{ itemName: 'Basic Materials', itemDesc: 'ok', itemCategory: 'resources' },
		]);
		expect(catalogItemNames(materialsRoot)).toEqual(['Basic Materials']);
		fs.rmSync(tmp, { recursive: true, force: true });
	});

	it('runSyncMaterialIcons dort entre lots wiki', async () => {
		const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'sync-icons-'));
		const materialsRoot = path.join(tmp, 'materials');
		const iconsDir = path.join(tmp, 'icons');
		fs.mkdirSync(path.join(materialsRoot, 'resources'), { recursive: true });
		fs.writeFileSync(
			path.join(materialsRoot, 'resources', 'bmat.json'),
			JSON.stringify([
				{ itemName: 'Item A', itemDesc: 'a', itemCategory: 'resources' },
				{ itemName: 'Item B', itemDesc: 'b', itemCategory: 'resources' },
				{ itemName: 'Item C', itemDesc: 'c', itemCategory: 'resources' },
			]),
		);
		const fetchWikitext = jest.fn(async (batch) => {
			const map = new Map();
			for (const t of batch) {
				map.set(t, `{{Item Infobox\n| name = ${t}\n| image = ${t.replace(/ /g, '')}.png\n}}`);
			}
			return map;
		});
		await runSyncMaterialIcons({
			materialsRoot,
			iconsDir,
			dryRun: true,
			fetchImpl: jest.fn(async () => ({
				ok: true,
				json: async () => ({ query: { pages: {} } }),
			})),
			fetchWikitext,
			log: () => undefined,
		});
		expect(sleep).toHaveBeenCalled();
		fs.rmSync(tmp, { recursive: true, force: true });
	});

	it('fetchImageInfoUrls throw si API error', async () => {
		const fetchImpl = jest.fn(async () => ({
			ok: true,
			json: async () => ({ error: { code: 'bad', info: 'fail' } }),
		}));
		await expect(fetchImageInfoUrls(['X.png'], { fetchImpl })).rejects.toThrow(/API imageinfo/);
	});

	it('downloadBinary refuse URL non autorisée', async () => {
		await expect(downloadBinary('https://evil.example/x.png', '/tmp/x.png'))
			.rejects.toThrow(/URL icône refusée/);
	});

	it('catalogItemNames ignore entrées sans itemName', () => {
		const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'sync-icons-'));
		const materialsRoot = path.join(tmp, 'materials');
		writeMaterialsFixture(materialsRoot, [
			{ itemDesc: 'no name', itemCategory: 'resources' },
			{ itemName: 'Basic Materials', itemDesc: 'ok', itemCategory: 'resources' },
		]);
		expect(catalogItemNames(materialsRoot)).toEqual(['Basic Materials']);
		fs.rmSync(tmp, { recursive: true, force: true });
	});

	it('runSyncMaterialIcons regroupe plusieurs itemNames sur même wikiTitle', async () => {
		const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'sync-icons-dup-'));
		const materialsRoot = path.join(tmp, 'materials');
		const iconsDir = path.join(tmp, 'icons');
		writeMaterialsFixture(materialsRoot, [
			{ itemName: 'Alias A', itemDesc: 'a', itemCategory: 'resources' },
			{ itemName: 'Alias B', itemDesc: 'b', itemCategory: 'resources' },
		]);
		const { inferWikiTitle } = require('../../../scripts/lib/wiki-sync/wiki-helpers');
		inferWikiTitle.mockImplementation(() => 'Shared Wiki Title');
		const fetchWikitext = jest.fn(async () => new Map([
			['Shared Wiki Title', `{{Item Infobox
| name = Shared
| image = SharedIcon.png
}}
`],
		]));
		const fetchImpl = jest.fn(async (url) => {
			if (String(url).includes('imageinfo')) {
				return {
					ok: true,
					json: async () => ({
						query: {
							pages: {
								1: {
									title: 'File:SharedIcon.png',
									imageinfo: [{ url: 'https://foxhole.wiki.gg/images/SharedIcon.png' }],
								},
							},
						},
					}),
				};
			}
			return mkFetchResponse();
		});
		const result = await runSyncMaterialIcons({
			materialsRoot,
			iconsDir,
			dryRun: true,
			fetchImpl,
			fetchWikitext,
			log: () => undefined,
		});
		expect(result.manifest['Alias A']).toBe('SharedIcon.png');
		expect(result.manifest['Alias B']).toBe('SharedIcon.png');
		fs.rmSync(tmp, { recursive: true, force: true });
	});

	it('fetchImageInfoUrls ignore pages sans title ni url valide', async () => {
		const fetchImpl = jest.fn(async () => ({
			ok: true,
			json: async () => ({
				query: {
					pages: {
						1: { missing: '', imageinfo: [{ url: 'https://evil.example/x.png' }] },
						2: { title: 'File:Bad.png' },
					},
				},
			}),
		}));
		const map = await fetchImageInfoUrls(['Bad.png'], { fetchImpl });
		expect(map.size).toBe(0);
	});

	it('runSyncMaterialIcons defaults sans fetchImpl explicite', async () => {
		const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'sync-def2-'));
		const materialsRoot = path.join(tmp, 'materials');
		const iconsDir = path.join(tmp, 'icons');
		writeMaterialsFixture(materialsRoot, [{ itemName: 'Bmats', itemDesc: 'x', faction: ['warden'] }]);
		global.fetch = jest.fn().mockResolvedValue({
			ok: true,
			json: async () => ({ query: { pages: {} } }),
		});
		const stderr = jest.spyOn(process.stderr, 'write').mockImplementation(() => true);
		await runSyncMaterialIcons({ materialsRoot, iconsDir });
		expect(stderr).toHaveBeenCalled();
		stderr.mockRestore();
		fs.rmSync(tmp, { recursive: true, force: true });
	});

	it('fetchImageInfoUrls utilise fetch global par défaut', async () => {
		global.fetch = jest.fn().mockResolvedValue({
			ok: true,
			json: async () => ({
				query: {
					pages: {
						1: { title: 'File:Ok.png', imageinfo: [{ url: ALLOWED_URL }] },
					},
				},
			}),
		});
		const map = await fetchImageInfoUrls(['Ok.png']);
		expect(map.get('Ok.png')).toBe(ALLOWED_URL);
		expect(global.fetch).toHaveBeenCalled();
	});

	it('fetchImageInfoUrls ignore query absent', async () => {
		const fetchImpl = jest.fn(async () => ({
			ok: true,
			json: async () => ({}),
		}));
		const map = await fetchImageInfoUrls(['X.png'], { fetchImpl });
		expect(map.size).toBe(0);
	});

	it('downloadBinary utilise basename si expectedName omis', async () => {
		const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'dl-bin-'));
		const dest = path.join(tmp, 'icon.png');
		const fetchImpl = jest.fn(async () => mkFetchResponse());
		await downloadBinary(ALLOWED_URL, dest, { fetchImpl });
		expect(fs.existsSync(dest)).toBe(true);
		fs.rmSync(tmp, { recursive: true, force: true });
	});

	it('runSyncMaterialIcons utilise defaults fetch/log/dryRun/force', async () => {
		const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'sync-def-'));
		const materialsRoot = path.join(tmp, 'materials');
		const iconsDir = path.join(tmp, 'icons');
		writeMaterialsFixture(materialsRoot, [{ itemName: 'Bmats', itemDesc: 'x', faction: ['warden'] }]);
		const fetchImpl = jest.fn(async (url) => {
			const u = String(url);
			if (u.includes('api.php')) {
				return {
					ok: true,
					json: async () => ({
						query: { pages: { 1: { title: 'Bmats', '*': '{{Item Infobox|name=Bmats|image=BmatsIcon.png}}' } } },
					}),
				};
			}
			if (u.includes('images/')) {
				return mkFetchResponse();
			}
			return { ok: false, status: 404, headers: { get: () => null }, arrayBuffer: async () => new ArrayBuffer(0) };
		});
		const stderr = jest.spyOn(process.stderr, 'write').mockImplementation(() => true);
		await runSyncMaterialIcons({ materialsRoot, iconsDir, fetchImpl, fetchWikitext: async () => new Map() });
		stderr.mockRestore();
		fs.rmSync(tmp, { recursive: true, force: true });
	});

	it('fetchImageInfoUrls batch delay entre lots', async () => {
		const fetchImpl = jest.fn(async () => ({
			ok: true,
			json: async () => ({ query: { pages: {} } }),
		}));
		await fetchImageInfoUrls(['A.png', 'B.png'], { fetchImpl });
		expect(sleep).toHaveBeenCalled();
	});
});
