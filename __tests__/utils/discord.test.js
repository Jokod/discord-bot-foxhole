const { parseMaterialId, discordTs, formatElapsed } = require('../../utils/discord.js');

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

	describe('discordTs', () => {
		it('formats epoch ms as Discord timestamp', () => {
			expect(discordTs(1_700_000_000_000)).toBe('<t:1700000000:F>');
			expect(discordTs(1_700_000_000_000, 'R')).toBe('<t:1700000000:R>');
		});

		it('returns em dash for invalid input', () => {
			expect(discordTs(null)).toBe('—');
			expect(discordTs(0)).toBe('—');
			expect(discordTs(Number.NaN)).toBe('—');
		});

		it('accepte une instance Date', () => {
			const d = new Date(1_700_000_000_000);
			expect(discordTs(d)).toBe('<t:1700000000:F>');
		});
	});

	describe('formatElapsed', () => {
		const translations = {
			translate: (key, vars) => `${key}:${vars.d}-${vars.h}-${vars.m}${vars.s != null ? `-${vars.s}` : ''}`,
		};

		it('formats via the given translation key', () => {
			expect(formatElapsed(
				{ days: 2, hours: 5, minutes: 12 },
				translations,
				'FOXHOLE_WAR_ELAPSED_VALUE',
			)).toBe('FOXHOLE_WAR_ELAPSED_VALUE:2-5-12');
		});

		it('includes seconds when present', () => {
			expect(formatElapsed(
				{ days: 1, hours: 0, minutes: 0, seconds: 40 },
				translations,
				'ANY_KEY',
			)).toBe('ANY_KEY:1-0-0-40');
		});

		it('returns em dash when elapsed or key missing', () => {
			expect(formatElapsed(null, translations, 'K')).toBe('—');
			expect(formatElapsed({ days: 1, hours: 0, minutes: 0 }, translations, '')).toBe('—');
			expect(formatElapsed({ days: 1, hours: 0, minutes: 0 }, null, 'K')).toBe('—');
			expect(formatElapsed({ hours: 0, minutes: 0 }, translations, 'K')).toBe('—');
		});
	});
});
