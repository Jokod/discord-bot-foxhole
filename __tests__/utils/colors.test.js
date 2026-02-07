const { getRandomColor } = require('../../utils/colors');

describe('colors utility', () => {
	describe('getRandomColor', () => {
		it('should return a number', () => {
			const color = getRandomColor();
			expect(typeof color).toBe('number');
		});

		it('should return a value between 0 and 0xFFFFFF', () => {
			const color = getRandomColor();
			expect(color).toBeGreaterThanOrEqual(0);
			expect(color).toBeLessThanOrEqual(0xFFFFFF);
		});

		it('should return different colors on multiple calls', () => {
			const colors = new Set();
			for (let i = 0; i < 100; i++) {
				colors.add(getRandomColor());
			}
			// Avec 100 appels, on devrait avoir au moins 90 couleurs différentes
			expect(colors.size).toBeGreaterThan(90);
		});

		it('should return a valid hexadecimal color', () => {
			const color = getRandomColor();
			const hexString = color.toString(16);
			expect(hexString).toMatch(/^[0-9a-f]+$/);
		});
	});
});
