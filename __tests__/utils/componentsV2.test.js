'use strict';

const { MessageFlags } = require('discord.js');
const {
	v2Flags,
	v2Text,
	buildV2Payload,
	assertV2Payload,
	isComponentsV2Message,
	textDisplay,
	separator,
	section,
	container,
	SeparatorSpacingSize,
	replyV2,
	editReplyV2,
	followUpV2,
	updateV2,
	sendV2,
	editOrRepostV2,
	V2_TEXT_LIMIT,
	isDisplayUpdateFailedError,
} = require('../../utils/componentsV2.js');

describe('componentsV2', () => {
	it('v2Flags includes IsComponentsV2', () => {
		expect(Number(v2Flags()) & MessageFlags.IsComponentsV2).toBeTruthy();
		expect(Number(v2Flags(MessageFlags.Ephemeral)) & MessageFlags.Ephemeral).toBeTruthy();
	});

	it('v2Text returns flags + components without content/embeds', () => {
		const payload = v2Text('Hello', { ephemeral: true });
		expect(payload.content).toBeUndefined();
		expect(payload.embeds).toBeUndefined();
		expect(payload.components).toHaveLength(1);
		expect(Number(payload.flags) & MessageFlags.IsComponentsV2).toBeTruthy();
		expect(Number(payload.flags) & MessageFlags.Ephemeral).toBeTruthy();
	});

	it('v2Text with accentColor wraps in container', () => {
		const payload = v2Text('Hi', { accentColor: 0xff0000 });
		const json = payload.components[0].toJSON();
		expect(json.type).toBe(17);
		expect(json.accent_color).toBe(0xff0000);
	});

	it('buildV2Payload combines container and action rows', () => {
		const row = { toJSON: () => ({ type: 1, components: [] }) };
		const payload = buildV2Payload({
			children: ['Title\n\nBody'],
			actionRows: [row],
			accentColor: 0x123456,
		});
		expect(payload.components).toHaveLength(2);
		expect(payload.components[0].toJSON().type).toBe(17);
	});

	it('buildV2Payload accepts non-string children and empty payload', () => {
		const display = textDisplay('x');
		const withBuilder = buildV2Payload({ children: [display, null, false] });
		expect(withBuilder.components).toHaveLength(1);

		const empty = buildV2Payload({ children: [], actionRows: [null] });
		expect(empty.components).toHaveLength(1);
		expect(empty.components[0].toJSON().content).toBe('\u200b');
	});

	it('assertV2Payload rejects content and embeds and strips empty keys', () => {
		expect(() => assertV2Payload({ content: 'x', components: [] })).toThrow(/content/);
		expect(() => assertV2Payload({ embeds: [{}], components: [] })).toThrow(/embeds/);
		expect(() => assertV2Payload(null)).toThrow(/V2 payload required/);
		expect(() => assertV2Payload('nope')).toThrow(/V2 payload required/);
		const cleaned = assertV2Payload({ content: '', embeds: [], components: [], flags: 1 });
		expect(cleaned.content).toBeUndefined();
		expect(cleaned.embeds).toBeUndefined();
		expect(cleaned.components).toEqual([]);
		expect(assertV2Payload(v2Text('ok'))).toBeTruthy();
	});

	it('editOrRepostV2 edits V2 messages and reposts legacy only', async () => {
		const edit = jest.fn().mockResolvedValue({ id: 'v2' });
		const v2 = {
			id: 'v2',
			edit,
			flags: { has: (f) => f === MessageFlags.IsComponentsV2 },
		};
		const r1 = await editOrRepostV2(v2, { send: jest.fn() }, v2Text('hi'));
		expect(r1.reposted).toBe(false);
		expect(edit).toHaveBeenCalled();

		const del = jest.fn().mockResolvedValue(undefined);
		const send = jest.fn().mockResolvedValue({ id: 'new' });
		const legacy = {
			id: 'old',
			delete: del,
			flags: { has: () => false },
		};
		const r2 = await editOrRepostV2(legacy, { send }, v2Text('hi'));
		expect(r2.reposted).toBe(true);
		expect(del).toHaveBeenCalled();
		expect(send).toHaveBeenCalled();
	});

	it('editOrRepostV2 reposts on unknown message, rethrows other API errors', async () => {
		const send = jest.fn().mockResolvedValue({ id: 'new' });
		const unknown = Object.assign(new Error('Unknown Message'), { code: 10008 });
		const editUnknown = jest.fn().mockRejectedValue(unknown);
		const v2Missing = {
			id: 'gone',
			edit: editUnknown,
			delete: jest.fn().mockResolvedValue(undefined),
			flags: { has: (f) => f === MessageFlags.IsComponentsV2 },
		};
		const r = await editOrRepostV2(v2Missing, { send }, v2Text('hi'));
		expect(r.reposted).toBe(true);
		expect(send).toHaveBeenCalled();

		const bad = Object.assign(new Error('Invalid Form Body'), { code: 50035 });
		const editBad = jest.fn().mockRejectedValue(bad);
		const v2Bad = {
			id: 'v2',
			edit: editBad,
			flags: { has: (f) => f === MessageFlags.IsComponentsV2 },
		};
		await expect(editOrRepostV2(v2Bad, { send }, v2Text('hi'))).rejects.toMatchObject({ code: 50035 });
		expect(isDisplayUpdateFailedError(bad)).toBe(true);
		expect(isDisplayUpdateFailedError(unknown)).toBe(false);
		expect(isDisplayUpdateFailedError({ status: 400 })).toBe(true);
		expect(isDisplayUpdateFailedError({ status: 200 })).toBe(false);
		expect(isDisplayUpdateFailedError(null)).toBe(false);
	});

	it('isComponentsV2Message checks flag and swallows has() errors', () => {
		expect(isComponentsV2Message(null)).toBe(false);
		expect(isComponentsV2Message({
			flags: { has: (f) => f === MessageFlags.IsComponentsV2 },
		})).toBe(true);
		expect(isComponentsV2Message({
			flags: { has: () => false },
		})).toBe(false);
		expect(isComponentsV2Message({
			flags: {
				has: () => {
					throw new Error('bad flags');
				},
			},
		})).toBe(false);
	});

	it('buildV2Payload keeps multi-child text without cross-truncation', () => {
		const a = 'a'.repeat(2500);
		const b = 'b'.repeat(2500);
		const payload = buildV2Payload({
			children: [a, separator(), b],
			accentColor: 1,
		});
		const containerJson = payload.components[0].toJSON();
		const texts = containerJson.components.filter((c) => c.type === 10).map((c) => c.content);
		expect(texts.join('').length).toBe(5000);
	});

	it('chunkMarkdown splits long text on newlines', () => {
		const { chunkMarkdown, textDisplays, joinBlocks, sectionBreak } = require('../../utils/componentsV2.js');
		const { ButtonBuilder, ButtonStyle, ActionRowBuilder, ThumbnailBuilder } = require('discord.js');
		expect(chunkMarkdown('')).toEqual([]);
		expect(chunkMarkdown(null)).toEqual([]);
		expect(chunkMarkdown('short')).toEqual(['short']);
		// Newline too early → hard cut at limit
		expect(chunkMarkdown(`a\n${'b'.repeat(120)}`, 100).every((p) => p.length <= 100)).toBe(true);
		const exact = 'z'.repeat(200);
		expect(chunkMarkdown(exact, 100)).toEqual(['z'.repeat(100), 'z'.repeat(100)]);
		const long = `${'line\n'.repeat(100)}${'x'.repeat(3900)}`;
		const parts = chunkMarkdown(long);
		expect(parts.length).toBeGreaterThan(1);
		expect(parts.every((p) => p.length <= V2_TEXT_LIMIT)).toBe(true);
		expect(chunkMarkdown('a'.repeat(V2_TEXT_LIMIT + 50)).length).toBeGreaterThan(1);
		expect(textDisplays('hi')).toHaveLength(1);
		expect(textDisplays('')).toHaveLength(1);
		expect(joinBlocks(['a', null, 'b', ''], { break: 'large' })).toHaveLength(3);
		expect(joinBlocks(['only'])).toHaveLength(1);
		expect(joinBlocks([[null, '', false], 'ok'])).toEqual(expect.arrayContaining(['ok']));
		expect(joinBlocks([false, null])).toEqual([]);
		expect(sectionBreak().toJSON().spacing).toBe(SeparatorSpacingSize.Large);
		const sec = section({
			text: ['Selected', '', null],
			button: new ButtonBuilder().setCustomId('x').setLabel('+1').setStyle(ButtonStyle.Primary),
		});
		expect(sec.toJSON().type).toBe(9);
		const thumb = section({
			text: '',
			thumbnail: new ThumbnailBuilder().setURL('https://cdn.discordapp.com/embed/avatars/0.png'),
		});
		expect(thumb.toJSON().accessory.type).toBe(11);
		expect(() => section({ text: 'no accessory' })).toThrow(/accessory/);

		const row = new ActionRowBuilder().addComponents(
			new ButtonBuilder().setCustomId('r').setLabel('R').setStyle(ButtonStyle.Secondary),
		);
		const withRow = container({ children: [row] });
		expect(withRow.toJSON().components[0].type).toBe(1);
		// Container as top-level non-display child
		expect(buildV2Payload({
			children: [container({ children: ['nested'] })],
		}).components[0].toJSON().type).toBe(17);

		// Prefer newline when deep enough in the window
		const splitOnNl = chunkMarkdown(`hello world\n${'y'.repeat(40)}`, 20);
		expect(splitOnNl[0]).toBe('hello world');
		expect(splitOnNl.join('')).toBe(`hello world${'y'.repeat(40)}`);
		// Exact fit → remainder branch after last chunk
		expect(chunkMarkdown('abcd', 2)).toEqual(['ab', 'cd']);
		expect(Number(buildV2Payload({ children: ['ephem'], ephemeral: true }).flags) & MessageFlags.Ephemeral)
			.toBeTruthy();
		expect(Number(buildV2Payload({ children: ['plain'], ephemeral: false }).flags) & MessageFlags.Ephemeral)
			.toBeFalsy();
		expect(Number(buildV2Payload({ children: ['plain'] }).flags) & MessageFlags.Ephemeral)
			.toBeFalsy();

		const oversized = 'a'.repeat(V2_TEXT_LIMIT + 100);
		const payload = v2Text(oversized);
		expect(payload.components.length).toBeGreaterThan(1);
		expect(payload.components.every((c) => c.toJSON().content.length <= V2_TEXT_LIMIT)).toBe(true);
		expect(v2Text(oversized, { accentColor: 1 }).components[0].toJSON().components.length).toBeGreaterThan(1);
	});

	it('covers textDisplay/container/v2Text edge branches', () => {
		expect(textDisplay(null).toJSON().content).toBe('\u200b');
		expect(textDisplay('').toJSON().content).toBe('\u200b');
		expect(container().toJSON().type).toBe(17);
		expect(container({ children: [textDisplay('a')] }).toJSON().components).toHaveLength(1);
		expect(container({ accentColor: 1, children: ['hi'] }).toJSON().accent_color).toBe(1);
		expect(v2Text(undefined).components).toHaveLength(1);
		expect(buildV2Payload().components).toHaveLength(1);
		expect(buildV2Payload({ actionRows: null, children: ['x'] }).components.length).toBeGreaterThan(0);
	});

	it('separator and multi-child accented container', () => {
		const sep = separator();
		expect(sep.toJSON().type).toBe(14);
		expect(sep.toJSON().divider).toBe(true);
		expect(separator({ divider: false, spacing: SeparatorSpacingSize.Large }).toJSON().spacing).toBe(2);

		const payload = buildV2Payload({
			children: ['Header', sep, 'Body', separator(), 'Footer', null, false],
			accentColor: 0xabcdef,
			actionRows: [{ toJSON: () => ({ type: 1 }) }],
		});
		const containerJson = payload.components[0].toJSON();
		expect(containerJson.type).toBe(17);
		expect(containerJson.components.filter((c) => c.type === 14)).toHaveLength(2);
		expect(containerJson.components.filter((c) => c.type === 10)).toHaveLength(3);
		expect(payload.components).toHaveLength(2);

		const nested = container({
			children: [
				'a',
				sep,
				textDisplay('b'),
				{ toJSON: () => ({ type: 14, divider: true }) },
				section({
					text: ['Sel'],
					button: new (require('discord.js').ButtonBuilder)()
						.setCustomId('acc')
						.setLabel('+1')
						.setStyle(require('discord.js').ButtonStyle.Primary),
				}),
			],
		});
		expect(nested.toJSON().components).toHaveLength(5);
		expect(nested.toJSON().components.some((c) => c.type === 9)).toBe(true);

		const topLevel = buildV2Payload({
			children: [textDisplay('solo'), separator()],
		});
		expect(topLevel.components).toHaveLength(2);

		const withRowChild = buildV2Payload({
			children: ['Hi', { toJSON: () => ({ type: 1, components: [] }) }],
			accentColor: 1,
		});
		expect(withRowChild.components).toHaveLength(2);

		expect(() => container({
			children: [{
				toJSON: () => {
					throw new Error('bad');
				},
			}],
		})).not.toThrow();

		// falsy non-string hits componentType(!child); non-display goes to otherChildren
		const withFalsy = buildV2Payload({ children: [0, 'ok'] });
		expect(withFalsy.components.length).toBeGreaterThanOrEqual(1);
		expect(container({ children: [null, false] }).toJSON().components || []).toEqual([]);

		// plain objects (no toJSON): type number vs missing
		const sepPlain = buildV2Payload({ children: [{ type: 14, divider: true }] });
		expect(sepPlain.components[0].type).toBe(14);
		const junk = buildV2Payload({ children: [{ nope: true }, { toJSON: () => null }] });
		expect(junk.components.length).toBeGreaterThanOrEqual(1);
	});

	it('editOrRepostV2 ignores delete failure and messages without id', async () => {
		const send = jest.fn().mockResolvedValue({ id: 'n' });
		const r1 = await editOrRepostV2({ flags: { has: () => false } }, { send }, v2Text('x'));
		expect(r1.reposted).toBe(true);

		const del = jest.fn().mockRejectedValue(new Error('cant delete'));
		const r2 = await editOrRepostV2({
			id: 'old',
			delete: del,
			flags: { has: () => false },
		}, { send }, v2Text('x'));
		expect(r2.reposted).toBe(true);
		expect(del).toHaveBeenCalled();
	});

	it('reply/edit/followUp/update/send wrappers forward assertV2Payload', async () => {
		const payload = v2Text('ok');
		const interaction = {
			reply: jest.fn().mockResolvedValue('r'),
			editReply: jest.fn().mockResolvedValue('e'),
			followUp: jest.fn().mockResolvedValue('f'),
			update: jest.fn().mockResolvedValue('u'),
		};
		const channel = { send: jest.fn().mockResolvedValue('s') };

		await expect(replyV2(interaction, payload)).resolves.toBe('r');
		await expect(editReplyV2(interaction, payload)).resolves.toBe('e');
		await expect(followUpV2(interaction, payload)).resolves.toBe('f');
		await expect(updateV2(interaction, payload)).resolves.toBe('u');
		await expect(sendV2(channel, payload)).resolves.toBe('s');

		expect(interaction.reply).toHaveBeenCalledWith(expect.objectContaining({ components: expect.any(Array) }));
		expect(channel.send).toHaveBeenCalledWith(expect.objectContaining({ components: expect.any(Array) }));
	});
});
