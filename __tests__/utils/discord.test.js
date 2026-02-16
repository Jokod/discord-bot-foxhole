const { parseMaterialId } = require('../../utils/discord.js');

describe('utils/discord.js', () => {
	describe('parseMaterialId', () => {
		it('returns message ID when given a Discord message link', () => {
			const link = 'https://discord.com/channels/123456789/987654321/111222333444555666';
			expect(parseMaterialId(link)).toBe('111222333444555666');
		});

		it('returns the same ID when given a raw message ID', () => {
			expect(parseMaterialId('111222333444555666')).toBe('111222333444555666');
		});

		it('trims whitespace and returns as-is when not a link', () => {
			expect(parseMaterialId('  111222333444555666  ')).toBe('111222333444555666');
		});

		it('returns input as-is when link format does not match', () => {
			const invalid = 'https://discord.com/some/other/path';
			expect(parseMaterialId(invalid)).toBe(invalid);
		});

		it('returns falsy input unchanged', () => {
			expect(parseMaterialId(null)).toBe(null);
			expect(parseMaterialId(undefined)).toBe(undefined);
			expect(parseMaterialId('')).toBe('');
		});

		it('returns non-string input unchanged', () => {
			expect(parseMaterialId(123)).toBe(123);
		});
	});
});
