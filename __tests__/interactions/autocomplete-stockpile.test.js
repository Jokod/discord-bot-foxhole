describe('Autocomplete stockpile', () => {
	let stockpileAutocomplete;

	beforeEach(() => {
		jest.resetModules();
		stockpileAutocomplete = require('../../interactions/autocomplete/stockpile.js');
	});

	it('répond toujours [] (plus d’options id sur /stockpile)', async () => {
		const interaction = {
			guild: { id: 'guild-123' },
			options: {
				getSubcommand: () => 'list',
				getFocused: () => ({ name: 'id', value: 'x' }),
			},
			respond: jest.fn().mockResolvedValue(undefined),
		};

		await stockpileAutocomplete.execute(interaction);

		expect(interaction.respond).toHaveBeenCalledWith([]);
	});
});
