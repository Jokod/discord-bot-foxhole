'use strict';

const { MessageFlags } = require('discord.js');
const { v2Text } = require('../../utils/componentsV2.js');

/**
 * Flatten Components V2 payload text (Text Display + Container children).
 * @param {object} payload
 * @returns {string}
 */
function getV2Text(payload) {
	const extract = (node) => {
		if (!node) return '';
		const j = typeof node.toJSON === 'function' ? node.toJSON() : node;
		if (typeof j.content === 'string') return j.content;
		if (Array.isArray(j.components)) return j.components.map(extract).join('\n');
		return '';
	};
	return (payload?.components || []).map(extract).join('\n');
}

/**
 * @param {object} payload
 * @returns {number|undefined}
 */
function getV2AccentColor(payload) {
	for (const c of payload?.components || []) {
		const j = typeof c.toJSON === 'function' ? c.toJSON() : c;
		if (j.accent_color != null) return j.accent_color;
	}
	return undefined;
}

/**
 * @param {object} payload
 * @param {{ ephemeral?: boolean, text?: string|RegExp }} [opts]
 */
function expectV2Payload(payload, { ephemeral, text } = {}) {
	expect(payload).toEqual(expect.objectContaining({
		components: expect.any(Array),
	}));
	expect(payload.content).toBeUndefined();
	expect(payload.embeds).toBeUndefined();
	expect(Number(payload.flags) & MessageFlags.IsComponentsV2).toBeTruthy();
	if (ephemeral) {
		expect(Number(payload.flags) & MessageFlags.Ephemeral).toBeTruthy();
	}
	if (text != null) {
		const body = getV2Text(payload);
		if (text instanceof RegExp) expect(body).toMatch(text);
		else expect(body).toContain(text);
	}
}

/**
 * Assert the Nth call of a mock received a V2 payload.
 * @param {jest.Mock} mockFn
 * @param {{ ephemeral?: boolean, text?: string|RegExp, callIndex?: number }} [opts]
 */
function expectV2Call(mockFn, { ephemeral = true, text, callIndex = 0 } = {}) {
	expect(mockFn).toHaveBeenCalled();
	expectV2Payload(mockFn.mock.calls[callIndex][0], { ephemeral, text });
}

module.exports = {
	MessageFlags,
	v2Text,
	getV2Text,
	getV2AccentColor,
	expectV2Payload,
	expectV2Call,
};
