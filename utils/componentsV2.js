'use strict';

const {
	TextDisplayBuilder,
	ContainerBuilder,
	SeparatorBuilder,
	SectionBuilder,
	SeparatorSpacingSize,
	MessageFlags,
} = require('discord.js');
const {
	getDiscordErrorCode,
	isUnknownMessageError,
} = require('./discordAccess.js');

/** Soft per-TextDisplay cap (Discord also enforces total message limits). */
const V2_TEXT_LIMIT = 4000;

/** Discord component type ids used in this module. */
const TYPE_ACTION_ROW = 1;
const TYPE_SECTION = 9;
const TYPE_TEXT_DISPLAY = 10;
const TYPE_SEPARATOR = 14;
const TYPE_CONTAINER = 17;

/**
 * @param {number|bigint} [extra=0]
 * @returns {number|bigint}
 */
function v2Flags(extra = 0) {
	return MessageFlags.IsComponentsV2 | extra;
}

/**
 * @param {import('discord.js').Message | null | undefined} message
 * @returns {boolean}
 */
function isComponentsV2Message(message) {
	if (!message?.flags) return false;
	try {
		return message.flags.has(MessageFlags.IsComponentsV2);
	}
	catch {
		return false;
	}
}

/**
 * @param {string} markdown
 * @returns {import('discord.js').TextDisplayBuilder}
 */
function textDisplay(markdown) {
	const content = String(markdown ?? '').slice(0, V2_TEXT_LIMIT);
	return new TextDisplayBuilder().setContent(content || '\u200b');
}

/**
 * Split markdown into TextDisplay-safe chunks (prefer newline boundaries).
 * @param {string} markdown
 * @param {number} [limit=V2_TEXT_LIMIT]
 * @returns {string[]}
 */
function chunkMarkdown(markdown, limit = V2_TEXT_LIMIT) {
	const text = String(markdown ?? '');
	if (!text) return [];
	if (text.length <= limit) return [text];

	/** @type {string[]} */
	const chunks = [];
	let rest = text;
	while (rest.length > limit) {
		const newlineAt = rest.lastIndexOf('\n', limit);
		const cut = newlineAt >= Math.floor(limit * 0.4) ? newlineAt : limit;
		chunks.push(rest.slice(0, cut));
		rest = rest.slice(cut);
		if (rest.startsWith('\n')) rest = rest.slice(1);
	}
	chunks.push(rest);
	return chunks;
}

/**
 * @param {string} markdown
 * @returns {import('discord.js').TextDisplayBuilder[]}
 */
function textDisplays(markdown) {
	const parts = chunkMarkdown(markdown);
	if (!parts.length) return [textDisplay('\u200b')];
	return parts.map((part) => textDisplay(part));
}

/**
 * @param {{ divider?: boolean, spacing?: import('discord.js').SeparatorSpacingSize }} [opts]
 * @returns {import('discord.js').SeparatorBuilder}
 */
function separator({ divider = true, spacing = SeparatorSpacingSize.Small } = {}) {
	return new SeparatorBuilder()
		.setDivider(divider)
		.setSpacing(spacing);
}

/**
 * Major visual break between layout zones.
 * @returns {import('discord.js').SeparatorBuilder}
 */
function sectionBreak() {
	return separator({ divider: true, spacing: SeparatorSpacingSize.Large });
}

/**
 * Section (type 9) — requires a button or thumbnail accessory.
 * @param {object} opts
 * @param {string|string[]} opts.text - one or more markdown blocks (max 3 text displays)
 * @param {import('discord.js').ButtonBuilder} [opts.button]
 * @param {import('discord.js').ThumbnailBuilder} [opts.thumbnail]
 * @returns {import('discord.js').SectionBuilder}
 */
function section({ text, button, thumbnail }) {
	const blocks = Array.isArray(text) ? text : [text];
	const displays = blocks
		.filter((b) => b != null && b !== false && String(b).length > 0)
		.slice(0, 3)
		.map((b) => textDisplay(b));
	if (!displays.length) displays.push(textDisplay('\u200b'));

	const s = new SectionBuilder().addTextDisplayComponents(...displays);
	if (button) s.setButtonAccessory(button);
	else if (thumbnail) s.setThumbnailAccessory(thumbnail);
	else {
		throw new Error('section() requires button or thumbnail accessory');
	}
	return s;
}

/**
 * Interleave non-empty layout blocks with separators.
 * @param {Array<string|object|Array<string|object>|null|false|undefined>} blocks
 * @param {{ break?: 'small'|'large' }} [opts]
 * @returns {Array<string|object>}
 */
function joinBlocks(blocks, { break: breakStyle = 'small' } = {}) {
	const sep = breakStyle === 'large' ? sectionBreak() : separator();
	/** @type {Array<string|object>} */
	const out = [];
	for (const block of blocks) {
		if (block == null || block === false) continue;
		const parts = Array.isArray(block) ? block : [block];
		const flat = parts.filter((p) => p != null && p !== false && p !== '');
		if (!flat.length) continue;
		if (out.length) out.push(sep);
		out.push(...flat);
	}
	return out;
}

/**
 * @param {unknown} child
 * @returns {number|null} Discord component type, or null
 */
function componentType(child) {
	if (!child || typeof child === 'string') return null;
	if (child instanceof SeparatorBuilder) return TYPE_SEPARATOR;
	if (child instanceof TextDisplayBuilder) return TYPE_TEXT_DISPLAY;
	if (child instanceof SectionBuilder) return TYPE_SECTION;
	if (child instanceof ContainerBuilder) return TYPE_CONTAINER;
	try {
		const json = typeof child.toJSON === 'function' ? child.toJSON() : child;
		return typeof json?.type === 'number' ? json.type : null;
	}
	catch {
		return null;
	}
}

/**
 * @param {import('discord.js').ContainerBuilder} c
 * @param {string|object} child
 */
function appendContainerChild(c, child) {
	if (child == null || child === false) return;
	if (typeof child === 'string') {
		c.addTextDisplayComponents(...textDisplays(child));
		return;
	}
	const type = componentType(child);
	if (type === TYPE_SEPARATOR) {
		c.addSeparatorComponents(child);
		return;
	}
	if (type === TYPE_SECTION) {
		c.addSectionComponents(child);
		return;
	}
	if (type === TYPE_ACTION_ROW) {
		c.addActionRowComponents(child);
		return;
	}
	if (type === TYPE_TEXT_DISPLAY) {
		c.addTextDisplayComponents(child);
		return;
	}
	// Unknown builders / plain objects with type 10-ish: best-effort as text
	c.addTextDisplayComponents(child);
}

/**
 * @param {{ accentColor?: number|null, children?: Array<string|object> }} [opts]
 * @returns {import('discord.js').ContainerBuilder}
 */
function container({ accentColor = null, children = [] } = {}) {
	const c = new ContainerBuilder();
	if (accentColor != null) {
		c.setAccentColor(accentColor);
	}
	for (const child of children) {
		appendContainerChild(c, child);
	}
	return c;
}

/**
 * Simple V2 message (errors, success, about, etc.).
 * @param {string} markdown
 * @param {{ ephemeral?: boolean, accentColor?: number|null }} [opts]
 * @returns {{ flags: number|bigint, components: object[] }}
 */
function v2Text(markdown, { ephemeral = false, accentColor = null } = {}) {
	const body = String(markdown ?? '');
	/** @type {object[]} */
	let components;
	if (accentColor != null) {
		components = [container({ accentColor, children: textDisplays(body) })];
	}
	else {
		components = textDisplays(body);
	}
	return {
		flags: v2Flags(ephemeral ? MessageFlags.Ephemeral : 0),
		components,
	};
}

/**
 * Whether a child belongs inside a content container (text / separator / section).
 * @param {unknown} child
 */
function isDisplayChild(child) {
	if (typeof child === 'string') return true;
	const type = componentType(child);
	return type === TYPE_TEXT_DISPLAY
		|| type === TYPE_SEPARATOR
		|| type === TYPE_SECTION;
}

/**
 * Rich V2 payload: optional container (or raw text displays) + action rows.
 * Mixed string / TextDisplay / Separator / Section children share one accented Container when accentColor is set.
 * Long strings are split across TextDisplays (newline-aware) to respect the 4000-char cap.
 *
 * @param {object} opts
 * @param {Array<string|object>} [opts.children] - strings, TextDisplay, Separator, Section, or top-level builders
 * @param {object[]} [opts.actionRows] - ActionRowBuilder[]
 * @param {boolean} [opts.ephemeral]
 * @param {number|null} [opts.accentColor] - if set, wrap display children in a Container
 * @returns {{ flags: number|bigint, components: object[] }}
 */
function buildV2Payload({
	children = [],
	actionRows = [],
	ephemeral = false,
	accentColor = null,
} = {}) {
	/** @type {object[]} */
	const components = [];

	const displayChildren = [];
	const otherChildren = [];
	for (const child of children) {
		if (child == null || child === false) continue;
		if (isDisplayChild(child)) displayChildren.push(child);
		else otherChildren.push(child);
	}

	if (accentColor != null && displayChildren.length) {
		components.push(container({
			accentColor,
			children: displayChildren,
		}));
		components.push(...otherChildren);
	}
	else {
		for (const child of displayChildren) {
			if (typeof child === 'string') components.push(...textDisplays(child));
			else components.push(child);
		}
		components.push(...otherChildren);
	}

	for (const row of actionRows || []) {
		if (row) components.push(row);
	}

	if (!components.length) {
		components.push(textDisplay('\u200b'));
	}

	return {
		flags: v2Flags(ephemeral ? MessageFlags.Ephemeral : 0),
		components,
	};
}

/**
 * Ensure payload is safe for IS_COMPONENTS_V2 (no content/embeds keys at all).
 * @param {object} payload
 */
function assertV2Payload(payload) {
	if (!payload || typeof payload !== 'object') {
		throw new Error('V2 payload required');
	}
	if (Object.prototype.hasOwnProperty.call(payload, 'content')
		&& payload.content != null
		&& payload.content !== '') {
		throw new Error('V2 payload must not include content');
	}
	if (Object.prototype.hasOwnProperty.call(payload, 'embeds')
		&& Array.isArray(payload.embeds)
		&& payload.embeds.length > 0) {
		throw new Error('V2 payload must not include embeds');
	}
	const clean = { ...payload };
	delete clean.content;
	delete clean.embeds;
	return clean;
}

/**
 * @param {import('discord.js').Interaction} interaction
 * @param {object} payload
 */
async function replyV2(interaction, payload) {
	return interaction.reply(assertV2Payload(payload));
}

/**
 * @param {import('discord.js').Interaction} interaction
 * @param {object} payload
 */
async function editReplyV2(interaction, payload) {
	return interaction.editReply(assertV2Payload(payload));
}

/**
 * @param {import('discord.js').Interaction} interaction
 * @param {object} payload
 */
async function followUpV2(interaction, payload) {
	return interaction.followUp(assertV2Payload(payload));
}

/**
 * @param {import('discord.js').MessageComponentInteraction} interaction
 * @param {object} payload
 */
async function updateV2(interaction, payload) {
	return interaction.update(assertV2Payload(payload));
}

/**
 * @param {import('discord.js').TextBasedChannel} channel
 * @param {object} payload
 */
async function sendV2(channel, payload) {
	return channel.send(assertV2Payload(payload));
}

/**
 * Edit a V2 message in place, or delete + send when the message is still legacy / missing.
 * Payload / API failures on an existing V2 message are rethrown (channel message left unchanged).
 * Unknown-message (10008) falls through to recovery repost.
 *
 * @param {import('discord.js').Message} message
 * @param {import('discord.js').TextBasedChannel} channel
 * @param {object} payload
 * @returns {Promise<{ message: import('discord.js').Message, reposted: boolean }>}
 */
async function editOrRepostV2(message, channel, payload) {
	const clean = assertV2Payload(payload);
	if (message && isComponentsV2Message(message)) {
		try {
			const edited = await message.edit(clean);
			return { message: edited, reposted: false };
		}
		catch (err) {
			if (!isUnknownMessageError(err)) {
				throw err;
			}
		}
	}
	if (message?.id) {
		await message.delete().catch(() => undefined);
	}
	const sent = await sendV2(channel, clean);
	return { message: sent, reposted: true };
}

/**
 * Discord REST / API failure while updating a Components V2 display (not “unknown message”).
 * @param {unknown} err
 * @returns {boolean}
 */
function isDisplayUpdateFailedError(err) {
	if (isUnknownMessageError(err)) return false;
	const code = getDiscordErrorCode(err);
	if (code != null) return true;
	const status = err && typeof err === 'object' ? err.status : null;
	return typeof status === 'number' && status >= 400;
}

module.exports = {
	V2_TEXT_LIMIT,
	v2Flags,
	isComponentsV2Message,
	textDisplay,
	textDisplays,
	chunkMarkdown,
	separator,
	sectionBreak,
	section,
	joinBlocks,
	container,
	v2Text,
	buildV2Payload,
	assertV2Payload,
	replyV2,
	editReplyV2,
	followUpV2,
	updateV2,
	sendV2,
	editOrRepostV2,
	isDisplayUpdateFailedError,
	SeparatorSpacingSize,
};
