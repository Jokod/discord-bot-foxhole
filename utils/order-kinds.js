'use strict';

/**
 * Order board kinds (shared metadata for slash + embeds).
 * @typedef {{ key: string, i18n: string, emoji: string, color: number }} OrderKindMeta
 */

/** @type {Record<string, OrderKindMeta>} */
const ORDER_KINDS = {
	prod: {
		key: 'prod',
		i18n: 'ORDER_KIND_PROD',
		emoji: '🏭',
		color: 0x5865F2,
	},
	transfer: {
		key: 'transfer',
		i18n: 'ORDER_KIND_TRANSFER',
		emoji: '🚚',
		color: 0xE67E22,
	},
	scrap: {
		key: 'scrap',
		i18n: 'ORDER_KIND_SCRAP',
		emoji: '⛏️',
		color: 0x57F287,
	},
};

const ORDER_KIND_KEYS = Object.keys(ORDER_KINDS);

/**
 * @param {string|null|undefined} kind
 * @returns {OrderKindMeta}
 */
function getOrderKindMeta(kind) {
	return ORDER_KINDS[kind] || ORDER_KINDS.prod;
}

/**
 * @param {string|null|undefined} kind
 * @returns {boolean}
 */
function isValidOrderKind(kind) {
	return Object.prototype.hasOwnProperty.call(ORDER_KINDS, kind);
}

module.exports = {
	ORDER_KINDS,
	ORDER_KIND_KEYS,
	getOrderKindMeta,
	isValidOrderKind,
};
