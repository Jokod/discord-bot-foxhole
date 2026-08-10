'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const {
	safeIconFilename,
	isAllowedIconUrl,
	detectImageKind,
	runSyncMaterialIcons,
	downloadBinary,
} = require('../../../scripts/lib/wiki-sync/sync-icons');
const { extractInfoboxImage } = require('../../../scripts/lib/wiki-sync/wiki-content');

const PNG_1X1 = Buffer.from(
	'89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c489'
	+ '0000000a49444154789c63000100000500010d0a2db40000000049454e44ae426082',
	'hex',
);

describe('wiki-sync / sync-icons', () => {
	it('safeIconFilename rejects traversal and non-images', () => {
		expect(safeIconFilename('BasicMaterialsIcon.png')).toBe('BasicMaterialsIcon.png');
		expect(safeIconFilename('../x.png')).toBeNull();
		expect(safeIconFilename('foo.txt')).toBeNull();
		expect(safeIconFilename('')).toBeNull();
	});

	it('isAllowedIconUrl restreint https + hôte + /images/', () => {
		expect(isAllowedIconUrl('https://foxhole.wiki.gg/images/BasicMaterialsIcon.png')).toBe(true);
		expect(isAllowedIconUrl('https://foxhole.wiki.gg/images/BasicMaterialsIcon.png?b246f1')).toBe(true);
		expect(isAllowedIconUrl('http://foxhole.wiki.gg/images/x.png')).toBe(false);
		expect(isAllowedIconUrl('https://evil.example/images/x.png')).toBe(false);
		expect(isAllowedIconUrl('https://foxhole.wiki.gg/wiki/File:x.png')).toBe(false);
		expect(isAllowedIconUrl('https://user:pass@foxhole.wiki.gg/images/x.png')).toBe(false);
	});

	it('detectImageKind reconnaît PNG', () => {
		expect(detectImageKind(PNG_1X1)).toBe('png');
		expect(detectImageKind(Buffer.from('not-an-image'))).toBeNull();
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

	it('downloadBinary refuse URL / magic invalides', async () => {
		const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'icon-dl-'));
		const dest = path.join(tmp, 'x.png');
		await expect(downloadBinary('https://evil.example/images/x.png', dest, {
			fetchImpl: jest.fn(),
		})).rejects.toThrow(/refusée/);

		const fetchImpl = jest.fn(async () => ({
			ok: true,
			headers: { get: () => 'image/png' },
			arrayBuffer: async () => Buffer.from('MZ-executable-not-png').buffer,
		}));
		await expect(downloadBinary('https://foxhole.wiki.gg/images/x.png', dest, {
			fetchImpl,
			expectedName: 'x.png',
		})).rejects.toThrow(/Magic bytes/);

		fs.rmSync(tmp, { recursive: true, force: true });
	});

	it('runSyncMaterialIcons dry-run écrit le manifest et skippe le disque images', async () => {
		const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'sync-icons-'));
		const materialsRoot = path.join(tmp, 'materials');
		const iconsDir = path.join(tmp, 'icons');
		fs.mkdirSync(path.join(materialsRoot, 'resources'), { recursive: true });
		fs.writeFileSync(
			path.join(materialsRoot, 'resources', 'bmat.json'),
			JSON.stringify([{
				faction: ['colonial', 'warden'],
				itemName: 'Basic Materials',
				itemDesc: 'test',
				itemCategory: 'resources',
			}]),
		);

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
			return {
				ok: true,
				headers: {
					get: (h) => (String(h).toLowerCase() === 'content-type' ? 'image/png' : null),
				},
				arrayBuffer: async () => PNG_1X1.buffer.slice(
					PNG_1X1.byteOffset,
					PNG_1X1.byteOffset + PNG_1X1.byteLength,
				),
			};
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
});
