'use strict';

const { escapeMarkdown } = require('discord.js');
const { safeEscapeMarkdown } = require('../../utils/markdown.js');

describe('markdown', () => {
	it('safeEscapeMarkdown retourne une chaîne vide pour null/undefined', () => {
		expect(safeEscapeMarkdown(null)).toBe('');
		expect(safeEscapeMarkdown(undefined)).toBe('');
	});

	it('safeEscapeMarkdown convertit les non-string', () => {
		expect(safeEscapeMarkdown(42)).toBe(escapeMarkdown('42'));
	});

	it('safeEscapeMarkdown retourne une chaîne vide sans contenu', () => {
		expect(safeEscapeMarkdown('')).toBe('');
	});

	it('safeEscapeMarkdown échappe le markdown', () => {
		expect(safeEscapeMarkdown('*bold*')).toBe(escapeMarkdown('*bold*'));
	});
});
